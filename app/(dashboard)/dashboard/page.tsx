import { redirect } from "next/navigation";

import { DashboardHomeClient } from "@/components/dashboard/dashboard-home-client";
import { PageHeader } from "@/components/ui/PageHeader";
import { createServerClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase.from("profiles").select("id,organization_id,role").eq("id", user.id).single();
  if (!profile) {
    redirect("/login");
  }

  const { data: applications } = await supabase
    .from("applications")
    .select("id,status,created_at,application_number,applicant_name,submitted_at")
    .eq("organization_id", profile.organization_id)
    .order("created_at", { ascending: false });

  const appIds = (applications ?? []).map((a) => a.id);

  const { data: scores } = appIds.length
    ? await supabase.from("risk_scores").select("application_id,overall_score").in("application_id", appIds)
    : { data: [] as Array<{ application_id: string; overall_score: number }> };

  const statusMap = new Map<string, number>();
  (applications ?? []).forEach((app) => statusMap.set(app.status, (statusMap.get(app.status) ?? 0) + 1));
  const byStatus = Array.from(statusMap.entries()).map(([status, count]) => ({ status, count }));

  const scoreMap = new Map((scores ?? []).map((item) => [item.application_id, item.overall_score]));

  const recent = (applications ?? []).slice(0, 5).map((item) => ({
    id: item.id,
    application_number: item.application_number,
    applicant_name: item.applicant_name,
    status: item.status,
    overall_score: scoreMap.get(item.id) ?? null,
    submitted_at: item.submitted_at,
  }));

  const reviewQueue = (applications ?? [])
    .filter((item) => item.status === "referred")
    .slice(0, 12)
    .map((item) => ({
      id: item.id,
      application_number: item.application_number,
      applicant_name: item.applicant_name,
      submitted_at: item.submitted_at,
      overall_score: scoreMap.get(item.id) ?? null,
    }));

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" description="Real-time underwriting performance and review pipeline." />

      <DashboardHomeClient byStatus={byStatus} recent={recent} reviewQueue={reviewQueue} showQueue={profile.role === "underwriter" || profile.role === "admin"} />
    </div>
  );
}
