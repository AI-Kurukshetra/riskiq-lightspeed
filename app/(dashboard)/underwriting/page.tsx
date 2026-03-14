import { differenceInHours, formatDistanceToNowStrict } from "date-fns";
import Link from "next/link";
import { redirect } from "next/navigation";

import { createServerClient } from "@/lib/supabase/server";

const waitColor = (hours: number): string => {
  if (hours < 2) return "text-status-approved";
  if (hours < 4) return "text-status-referred";
  return "text-status-declined";
};

export default async function UnderwritingQueuePage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role,organization_id").eq("id", user.id).single();
  if (!profile || !["underwriter", "admin", "super_admin"].includes(profile.role)) redirect("/dashboard");

  const { data: applications } = await supabase
    .from("applications")
    .select("id,application_number,applicant_name,submitted_at")
    .eq("organization_id", profile.organization_id)
    .eq("status", "referred")
    .order("submitted_at", { ascending: true });

  const ids = (applications ?? []).map((item) => item.id);
  const { data: scores } = ids.length ? await supabase.from("risk_scores").select("application_id,overall_score").in("application_id", ids) : { data: [] };
  const map = new Map((scores ?? []).map((item) => [item.application_id, item.overall_score]));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-3xl">Underwriting Queue</h1>
      </div>
      <div className="overflow-hidden rounded-card border border-border bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted">
              <th className="p-3">App #</th>
              <th className="p-3">Applicant</th>
              <th className="p-3">Risk Score</th>
              <th className="p-3">Submitted</th>
              <th className="p-3">SLA Timer</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {(applications ?? []).map((app) => {
              const duration = app.submitted_at ? formatDistanceToNowStrict(new Date(app.submitted_at)) : "-";
              const hours = app.submitted_at ? differenceInHours(new Date(), new Date(app.submitted_at)) : 0;
              return (
                <tr key={app.id} className="border-b border-border/60">
                  <td className="p-3 font-mono text-accent">{app.application_number ?? "-"}</td>
                  <td className="p-3">{app.applicant_name ?? "Unknown"}</td>
                  <td className="p-3"><span className="rounded-full bg-accent/20 px-2 py-0.5 text-xs text-accent">{map.get(app.id) ?? "-"}</span></td>
                  <td className="p-3">{app.submitted_at ? new Date(app.submitted_at).toLocaleString("en-IN") : "-"}</td>
                  <td className={`p-3 ${waitColor(hours)}`}>{duration}</td>
                  <td className="p-3"><Link className="rounded-button border border-border px-3 py-1" href={`/applications/${app.id}`}>Review</Link></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
