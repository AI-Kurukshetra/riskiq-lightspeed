"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";

import { sendApplicantStatusEmail } from "@/lib/email/applicant-status";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerClient } from "@/lib/supabase/server";
import type { ActionResult, DecisionType } from "@/types";

const makeDecisionSchema = z.object({
  applicationId: z.string().uuid(),
  decision: z.enum(["approved", "declined", "referred"]),
  reason: z.string().min(3),
  notes: z.string().optional(),
});

export async function makeDecision(
  applicationId: string,
  decision: DecisionType,
  reason: string,
  notes?: string,
): Promise<ActionResult<void>> {
  try {
    const parsed = makeDecisionSchema.safeParse({ applicationId, decision, reason, notes });
    if (!parsed.success) {
      return { success: false, error: parsed.error.message };
    }

    const supabase = await createServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: "Unauthorized" };
    }

    const admin = createAdminClient();

    const { data: actorProfile, error: actorError } = await admin
      .from("profiles")
      .select("id, role, organization_id")
      .eq("id", user.id)
      .single();

    if (actorError || !actorProfile) {
      return { success: false, error: "Profile not found" };
    }

    if (!["underwriter", "admin", "super_admin"].includes(actorProfile.role)) {
      return { success: false, error: "Forbidden: role not allowed" };
    }

    const { data: application, error: appError } = await admin
      .from("applications")
      .select("id, organization_id, submitted_by, coverage_selection, raw_form_data, applicant_email, applicant_name, application_number")
      .eq("id", parsed.data.applicationId)
      .single();

    if (appError || !application) {
      return { success: false, error: "Application not found" };
    }

    if (application.organization_id !== actorProfile.organization_id) {
      return { success: false, error: "Forbidden: organization mismatch" };
    }

    const { error: decisionError } = await admin
      .from("underwriting_decisions")
      .upsert(
        {
          application_id: parsed.data.applicationId,
          decision: parsed.data.decision,
          decision_reason: parsed.data.reason,
          triggered_rules: [],
          decided_by: "underwriter",
          decided_by_user: user.id,
          decided_at: new Date().toISOString(),
          override_reason: parsed.data.notes ?? null,
        },
        { onConflict: "application_id" },
      );

    if (decisionError) {
      return { success: false, error: decisionError.message };
    }

    const appStatus = parsed.data.decision === "approved" ? "approved" : parsed.data.decision;

    const { error: appUpdateError } = await admin
      .from("applications")
      .update({ status: appStatus, processed_at: new Date().toISOString() })
      .eq("id", parsed.data.applicationId);

    if (appUpdateError) {
      return { success: false, error: appUpdateError.message };
    }

    let quoteRecord: { id: string; quote_number: string | null } | null = null;

    if (parsed.data.decision === "approved") {
      const rawForm = application.raw_form_data as Record<string, unknown> | null;
      const coverageSelection = application.coverage_selection as Record<string, unknown> | null;

      const idv = typeof rawForm?.idv === "number" ? rawForm.idv : 1000000;
      const coverageTypeRaw = coverageSelection?.coverage_type;
      const coverageType =
        typeof coverageTypeRaw === "string" &&
        ["third_party", "comprehensive", "third_party_fire_theft"].includes(coverageTypeRaw)
          ? coverageTypeRaw
          : "comprehensive";

      const { data: savedQuote, error: quoteError } = await admin
        .from("quotes")
        .upsert({
          application_id: parsed.data.applicationId,
          coverage_type: coverageType,
          idv,
          base_premium: 0,
          risk_loading: 0,
          ncb_discount: 0,
          addon_costs: 0,
          final_premium: 0,
          premium_breakdown: {},
          selected_addons: [],
          status: "draft",
        }, { onConflict: "application_id" })
        .select("id,quote_number")
        .single();

      if (quoteError) {
        return { success: false, error: quoteError.message };
      }

      quoteRecord = savedQuote;
    }

    if (application.submitted_by) {
      const { error: notificationError } = await admin.from("notifications").insert({
        recipient_id: application.submitted_by,
        type: "decision_made",
        title: `Application ${parsed.data.applicationId} decision updated`,
        message: parsed.data.reason,
        application_id: parsed.data.applicationId,
      });

      if (notificationError) {
        return { success: false, error: notificationError.message };
      }
    }

    const { error: auditError } = await admin.from("audit_logs").insert({
      action_type: "MANUAL_DECISION",
      entity_type: "underwriting_decisions",
      entity_id: parsed.data.applicationId,
      performed_by: user.id,
      new_value: {
        decision: parsed.data.decision,
        reason: parsed.data.reason,
        notes: parsed.data.notes ?? null,
      },
      metadata: { source: "makeDecision" },
    });

    if (auditError) {
      return { success: false, error: auditError.message };
    }

    await sendApplicantStatusEmail({
      applicantEmail: application.applicant_email,
      applicantName: application.applicant_name,
      applicationNumber: application.application_number,
      status: appStatus,
      summary: parsed.data.reason,
      quoteId: quoteRecord?.id ?? null,
      quoteNumber: quoteRecord?.quote_number ?? null,
    });

    return { success: true, data: undefined };
  } catch (error: unknown) {
    console.error("makeDecision error", error);
    return { success: false, error: "Failed to apply decision" };
  }
}

export async function toggleRule(ruleId: string, isActive: boolean): Promise<ActionResult<void>> {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Unauthorized" };

    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || !["admin", "super_admin"].includes(profile.role)) {
      return { success: false, error: "Forbidden" };
    }

    const { error } = await admin.from("underwriting_rules").update({ is_active: isActive }).eq("id", ruleId);
    if (error) return { success: false, error: error.message };

    revalidatePath("/rules");
    return { success: true, data: undefined };
  } catch (error: unknown) {
    console.error("toggleRule error", error);
    return { success: false, error: "Failed to update rule" };
  }
}

export async function updateQuoteStatus(quoteId: string, status: string): Promise<ActionResult<void>> {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Unauthorized" };

    const admin = createAdminClient();
    const { data: quote, error: quoteError } = await admin
      .from("quotes")
      .select("id,application_id,quote_number")
      .eq("id", quoteId)
      .single();

    if (quoteError || !quote) {
      return { success: false, error: "Quote not found" };
    }

    const { data: application, error: applicationError } = await admin
      .from("applications")
      .select("application_number,applicant_email,applicant_name")
      .eq("id", quote.application_id)
      .single();

    if (applicationError || !application) {
      return { success: false, error: "Application not found for quote" };
    }

    const { error } = await admin.from("quotes").update({ status }).eq("id", quoteId);
    if (error) return { success: false, error: error.message };

    await sendApplicantStatusEmail({
      applicantEmail: application.applicant_email,
      applicantName: application.applicant_name,
      applicationNumber: application.application_number,
      status,
      summary:
        status === "accepted"
          ? "The selected quote was accepted. Our team can now continue with policy issuance or offline payment collection."
          : "Changes were requested on your quote. A revised premium proposal can be shared after review.",
      quoteId: quote.id,
      quoteNumber: quote.quote_number,
    });

    revalidatePath("/quotes");
    revalidatePath(`/quotes/${quoteId}`);
    return { success: true, data: undefined };
  } catch (error: unknown) {
    console.error("updateQuoteStatus error", error);
    return { success: false, error: "Failed to update quote status" };
  }
}

export async function selectQuoteCoverage(
  quoteId: string,
  coverageType: "third_party" | "third_party_fire_theft" | "comprehensive",
): Promise<ActionResult<void>> {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Unauthorized" };

    const admin = createAdminClient();
    const { error } = await admin.from("quotes").update({ coverage_type: coverageType }).eq("id", quoteId);
    if (error) return { success: false, error: error.message };

    revalidatePath("/quotes");
    revalidatePath(`/quotes/${quoteId}`);
    return { success: true, data: undefined };
  } catch (error: unknown) {
    console.error("selectQuoteCoverage error", error);
    return { success: false, error: "Failed to update quote plan" };
  }
}
