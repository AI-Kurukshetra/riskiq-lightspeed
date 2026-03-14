import { Plus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ApplicationsTableClient } from "@/components/applications/applications-table-client";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { createServerClient } from "@/lib/supabase/server";

export default async function ApplicationsPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("id,role,organization_id").eq("id", user.id).single();

  if (!profile) redirect("/login");

  let query = supabase
    .from("applications")
    .select("id,application_number,applicant_name,status,submitted_at,vehicle_details")
    .eq("organization_id", profile.organization_id)
    .order("created_at", { ascending: false });

  if (profile.role === "agent") {
    query = query.eq("submitted_by", user.id);
  }

  const { data: applications } = await query;

  const appIds = (applications ?? []).map((app) => app.id);
  const { data: scores } = appIds.length
    ? await supabase.from("risk_scores").select("application_id,overall_score,risk_level").in("application_id", appIds)
    : { data: [] as Array<{ application_id: string; overall_score: number | null; risk_level: string | null }> };

  const scoreMap = new Map((scores ?? []).map((score) => [score.application_id, { overall: score.overall_score, level: score.risk_level }]));

  const rows = (applications ?? []).map((item) => {
    const vehicle = (item.vehicle_details as Record<string, unknown> | null) ?? {};
    const score = scoreMap.get(item.id);
    return {
      id: item.id,
      application_number: item.application_number,
      applicant_name: item.applicant_name,
      status: item.status,
      submitted_at: item.submitted_at,
      vehicle_make: String(vehicle.make ?? ""),
      vehicle_model: String(vehicle.model ?? ""),
      overall_score: score?.overall ?? null,
      risk_level: score?.level ?? null,
    };
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Applications"
        description="Review, filter, and manage insurance applications across your pipeline."
        actions={
          <Button asChild className="bg-accent text-white hover:bg-accent/90">
            <Link href="/applications/new">
              <Plus className="mr-2 h-4 w-4" />
              New Application
            </Link>
          </Button>
        }
      />
      <ApplicationsTableClient rows={rows} />
    </div>
  );
}
