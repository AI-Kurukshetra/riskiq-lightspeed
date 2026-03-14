import { notFound, redirect } from "next/navigation";

import { ApplicationDetailTabs } from "@/components/applications/application-detail-tabs";
import { createServerClient } from "@/lib/supabase/server";

export default async function ApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id,role,organization_id")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  const { data: application } = await supabase
    .from("applications")
    .select(
      "id,application_number,status,product_type,applicant_name,applicant_email,applicant_phone,applicant_dob,applicant_address,vehicle_details,driving_history,coverage_selection,raw_form_data,organization_id,submitted_by,assigned_to,submitted_at,processed_at,created_at,updated_at",
    )
    .eq("id", id)
    .single();

  if (!application || application.organization_id !== profile.organization_id) {
    notFound();
  }

  const [{ data: riskScore }, { data: decision }, { data: quote }, { data: documents }, { data: auditLogs }] = await Promise.all([
    supabase
      .from("risk_scores")
      .select("id,application_id,overall_score,risk_level,score_components,explanation,fraud_signals,scored_at")
      .eq("application_id", id)
      .maybeSingle(),
    supabase
      .from("underwriting_decisions")
      .select("id,application_id,decision,decision_reason,triggered_rules,decided_by,decided_by_user,decided_at,override_reason")
      .eq("application_id", id)
      .maybeSingle(),
    supabase
      .from("quotes")
      .select("id,application_id,quote_number,coverage_type,idv,base_premium,risk_loading,ncb_discount,addon_costs,final_premium,premium_breakdown,selected_addons,valid_until,status,pdf_url,created_at")
      .eq("application_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("documents")
      .select("id,application_id,document_type,file_name,file_url,file_size_bytes,is_verified,uploaded_by,created_at")
      .eq("application_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("audit_logs")
      .select("id,action_type,entity_type,entity_id,performed_by,old_value,new_value,metadata,created_at")
      .eq("entity_id", id)
      .order("created_at", { ascending: false }),
  ]);

  let auditRows = auditLogs ?? [];
  if (auditRows.length > 0) {
    const actorIds = Array.from(new Set(auditRows.map((row) => row.performed_by).filter(Boolean)));
    if (actorIds.length > 0) {
      const { data: actors } = await supabase.from("profiles").select("id,full_name").in("id", actorIds);
      const actorMap = new Map((actors ?? []).map((actor) => [actor.id, actor.full_name]));
      auditRows = auditRows.map((row) => ({ ...row, actor_name: row.performed_by ? actorMap.get(row.performed_by) ?? "User" : "System" }));
    }
  }

  return (
    <ApplicationDetailTabs
      role={profile.role}
      application={application as Record<string, unknown>}
      riskScore={(riskScore as Record<string, unknown> | null) ?? null}
      decision={(decision as Record<string, unknown> | null) ?? null}
      quote={(quote as Record<string, unknown> | null) ?? null}
      documents={(documents as Array<Record<string, unknown>> | null) ?? []}
      auditLogs={auditRows as Array<Record<string, unknown>>}
    />
  );
}
