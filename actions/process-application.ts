"use server";

import { z } from "zod";

import { validateApplicantEmailRules } from "@/lib/applications/applicant-email";
import { processDecision } from "@/lib/decision-engine/processor";
import { DEFAULT_RULES } from "@/lib/decision-engine/rules";
import { sendApplicantStatusEmail } from "@/lib/email/applicant-status";
import { calculatePremium } from "@/lib/premium-calculator/calculator";
import { calculateRiskScore } from "@/lib/risk-engine/scorer";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerClient } from "@/lib/supabase/server";
import type { ActionResult, AppStatus, ApplicationInput, DecisionResult, PremiumBreakdown } from "@/types";

const applicationInputSchema = z.object({
  age: z.number().int().min(16).max(100),
  drivingExperienceYears: z.number().min(0).max(80),
  minorViolations: z.number().int().min(0),
  duiCount: z.number().int().min(0),
  duiInLast2Years: z.boolean(),
  claimsCount: z.number().int().min(0),
  atFaultClaimsCount: z.number().int().min(0),
  vehicleAgeYears: z.number().int().min(0),
  hasModifications: z.boolean(),
  isEv: z.boolean(),
  isSportsCar: z.boolean(),
  annualIncome: z.number().min(0),
  idv: z.number().min(1),
  ncbYears: z.number().int().min(0),
  selectedAddons: z.array(z.string()),
});

export interface ProcessResult {
  applicationId: string;
  decision: DecisionResult["decision"];
  score: number;
  quote?: PremiumBreakdown;
}

export async function processApplication(applicationId: string): Promise<ActionResult<ProcessResult>> {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: "Unauthorized" };
    }

    const admin = createAdminClient();

    const { data: actorProfile, error: actorProfileError } = await admin
      .from("profiles")
      .select("id, organization_id")
      .eq("id", user.id)
      .single();

    if (actorProfileError || !actorProfile) {
      return { success: false, error: "Profile not found for current user" };
    }

    const { data: application, error: applicationError } = await admin
      .from("applications")
      .select(
        "id, organization_id, raw_form_data, submitted_by, coverage_selection, status, application_number, applicant_email, applicant_name",
      )
      .eq("id", applicationId)
      .single();

    if (applicationError || !application) {
      return { success: false, error: "Application not found" };
    }

    if (application.organization_id !== actorProfile.organization_id) {
      return { success: false, error: "Forbidden: organization mismatch" };
    }

    const applicantEmailRuleError = await validateApplicantEmailRules({
      admin,
      organizationId: actorProfile.organization_id,
      applicantEmail: application.applicant_email ?? "",
      currentUserEmail: user.email,
      currentApplicationId: application.id,
    });

    if (applicantEmailRuleError) {
      return { success: false, error: applicantEmailRuleError };
    }

    const parsedInput = applicationInputSchema.safeParse(application.raw_form_data);
    if (!parsedInput.success) {
      return { success: false, error: parsedInput.error.message };
    }

    const input: ApplicationInput = parsedInput.data;
    const scoreResult = calculateRiskScore(input);
    const decisionResult = processDecision(scoreResult, input, DEFAULT_RULES);

    let premiumResult: PremiumBreakdown | undefined;
    if (decisionResult.decision !== "declined") {
      premiumResult = calculatePremium({
        idv: input.idv,
        vehicleAgeYears: input.vehicleAgeYears,
        score: scoreResult.overallScore,
        ncbYears: input.ncbYears,
        selectedAddons: input.selectedAddons,
      });
    }

    const nextStatus: AppStatus =
      decisionResult.decision === "approved"
        ? "approved"
        : decisionResult.decision === "declined"
          ? "declined"
          : "referred";

    const { error: updateAppError } = await admin
      .from("applications")
      .update({ status: nextStatus, processed_at: new Date().toISOString() })
      .eq("id", applicationId)
      .eq("organization_id", actorProfile.organization_id);

    if (updateAppError) {
      return { success: false, error: updateAppError.message };
    }

    const { error: riskInsertError } = await admin
      .from("risk_scores")
      .upsert(
        {
          application_id: applicationId,
          overall_score: scoreResult.overallScore,
          risk_level: scoreResult.riskLevel,
          score_components: scoreResult.scoreComponents,
          explanation: decisionResult.primaryReason,
          fraud_signals: {},
          scored_at: new Date().toISOString(),
        },
        { onConflict: "application_id" },
      );

    if (riskInsertError) {
      return { success: false, error: riskInsertError.message };
    }

    const { error: decisionInsertError } = await admin
      .from("underwriting_decisions")
      .upsert(
        {
          application_id: applicationId,
          decision: decisionResult.decision,
          decision_reason: decisionResult.primaryReason,
          triggered_rules: decisionResult.triggeredRuleIds,
          decided_by: "system",
          decided_by_user: null,
          decided_at: new Date().toISOString(),
          override_reason: null,
        },
        { onConflict: "application_id" },
      );

    if (decisionInsertError) {
      return { success: false, error: decisionInsertError.message };
    }

    let quoteRecord: { id: string; quote_number: string | null } | null = null;

    if (premiumResult && (decisionResult.decision === "approved" || decisionResult.decision === "referred")) {
      const coverageTypeRaw = (application.coverage_selection as Record<string, unknown> | null)?.coverage_type;
      const coverageType =
        typeof coverageTypeRaw === "string" &&
        ["third_party", "comprehensive", "third_party_fire_theft"].includes(coverageTypeRaw)
          ? coverageTypeRaw
          : "comprehensive";

      const { data: insertedQuote, error: quoteInsertError } = await admin
        .from("quotes")
        .insert({
          application_id: applicationId,
          coverage_type: coverageType,
          idv: input.idv,
          base_premium: premiumResult.basePremium,
          risk_loading: premiumResult.riskLoading,
          ncb_discount: premiumResult.ncbDiscount,
          addon_costs: premiumResult.addonCosts,
          final_premium: premiumResult.finalPremium,
          premium_breakdown: premiumResult,
          selected_addons: input.selectedAddons,
          status: "draft",
          valid_until: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
        })
        .select("id,quote_number")
        .single();

      if (quoteInsertError) {
        return { success: false, error: quoteInsertError.message };
      }

      quoteRecord = insertedQuote;
    }

    if (application.submitted_by) {
      const { error: notificationError } = await admin.from("notifications").insert({
        recipient_id: application.submitted_by,
        type: "decision_made",
        title: `Application ${application.application_number ?? application.id} processed`,
        message: `Decision: ${decisionResult.decision}`,
        application_id: application.id,
      });

      if (notificationError) {
        return { success: false, error: notificationError.message };
      }
    }

    const { error: auditError } = await admin.from("audit_logs").insert({
      action_type: "PROCESS_APPLICATION",
      entity_type: "applications",
      entity_id: application.id,
      performed_by: user.id,
      old_value: { status: application.status },
      new_value: { status: nextStatus, decision: decisionResult.decision, score: scoreResult.overallScore },
      metadata: { triggeredRuleIds: decisionResult.triggeredRuleIds },
    });

    if (auditError) {
      return { success: false, error: auditError.message };
    }

    await sendApplicantStatusEmail({
      applicantEmail: application.applicant_email,
      applicantName: application.applicant_name,
      applicationNumber: application.application_number,
      status: nextStatus,
      summary:
        decisionResult.decision === "approved"
          ? "Your application was approved and a quote has been prepared for you."
          : decisionResult.decision === "referred"
            ? "Your application needs manual underwriter review before a final decision is made."
            : decisionResult.primaryReason,
      quoteId: quoteRecord?.id ?? null,
      quoteNumber: quoteRecord?.quote_number ?? null,
    });

    return {
      success: true,
      data: {
        applicationId,
        decision: decisionResult.decision,
        score: scoreResult.overallScore,
        quote: premiumResult,
      },
    };
  } catch (error: unknown) {
    console.error("processApplication error", error);
    return { success: false, error: "Failed to process application" };
  }
}
