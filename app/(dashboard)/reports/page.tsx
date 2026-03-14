import { redirect } from "next/navigation";

import { ReportsClient } from "@/components/reports/reports-client";
import { createServerClient } from "@/lib/supabase/server";

export default async function ReportsPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role,organization_id").eq("id", user.id).single();
  if (!profile) redirect("/login");
  if (!["admin", "underwriter", "super_admin"].includes(profile.role)) redirect("/dashboard");

  const now = new Date();
  const from30 = new Date(now);
  from30.setDate(now.getDate() - 30);

  const from14 = new Date(now);
  from14.setDate(now.getDate() - 14);

  const from56 = new Date(now);
  from56.setDate(now.getDate() - 56);

  const { data: apps30 } = await supabase
    .from("applications")
    .select("id,status,submitted_at,processed_at,created_at")
    .eq("organization_id", profile.organization_id)
    .gte("created_at", from30.toISOString());

  const { data: apps14 } = await supabase
    .from("applications")
    .select("id,status,created_at")
    .eq("organization_id", profile.organization_id)
    .gte("created_at", from14.toISOString());

  const appIds30 = (apps30 ?? []).map((a) => a.id);

  const { data: acceptedQuotes } = appIds30.length
    ? await supabase.from("quotes").select("final_premium,created_at").eq("status", "accepted").in("application_id", appIds30)
    : { data: [] as Array<{ final_premium: number; created_at: string }> };

  const { data: decisions } = appIds30.length
    ? await supabase.from("underwriting_decisions").select("decision,decided_by,triggered_rules").in("application_id", appIds30)
    : { data: [] as Array<{ decision: string; decided_by: string; triggered_rules: string[] }> };

  const totalApplications = (apps30 ?? []).length;
  const processed = (apps30 ?? []).filter((item) => item.status !== "draft" && item.status !== "submitted");
  const stpApproved = (decisions ?? []).filter((d) => d.decision === "approved" && d.decided_by === "system").length;
  const stpRate = processed.length ? (stpApproved / processed.length) * 100 : 0;

  const processingTimes = processed
    .filter((item) => item.submitted_at && item.processed_at)
    .map((item) => (new Date(item.processed_at as string).getTime() - new Date(item.submitted_at as string).getTime()) / 1000)
    .filter((val) => val >= 0);
  const avgProcessingSeconds = processingTimes.length ? processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length : 0;

  const totalPremiumWritten = (acceptedQuotes ?? []).reduce((acc, row) => acc + Number(row.final_premium ?? 0), 0);

  const dailyMap = new Map<string, number>();
  (apps14 ?? []).forEach((app) => {
    const key = new Date(app.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
    dailyMap.set(key, (dailyMap.get(key) ?? 0) + 1);
  });

  const decisionCounts = new Map<string, number>();
  (decisions ?? []).forEach((item) => decisionCounts.set(item.decision, (decisionCounts.get(item.decision) ?? 0) + 1));

  const weeklyMap = new Map<string, number>();
  (acceptedQuotes ?? []).forEach((row) => {
    const week = `Week ${Math.ceil((new Date(row.created_at).getDate() + 1) / 7)}`;
    weeklyMap.set(week, (weeklyMap.get(week) ?? 0) + Number(row.final_premium ?? 0));
  });

  const topRulesMap = new Map<string, number>();
  (decisions ?? []).forEach((row) => {
    (row.triggered_rules ?? []).forEach((rule: string) => {
      topRulesMap.set(rule, (topRulesMap.get(rule) ?? 0) + 1);
    });
  });

  const stpDailyMap = new Map<string, { total: number; stp: number }>();
  (apps14 ?? []).forEach((app) => {
    const key = new Date(app.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
    const entry = stpDailyMap.get(key) ?? { total: 0, stp: 0 };
    entry.total += 1;
    stpDailyMap.set(key, entry);
  });

  const kpi = {
    totalApplications,
    stpRate,
    avgProcessingSeconds,
    totalPremiumWritten,
    trend: 0,
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-3xl">Reports & Analytics</h1>
        <p className="text-sm text-muted">Last 30 days</p>
      </div>
      <ReportsClient
        kpi={kpi}
        daily={Array.from(dailyMap.entries()).map(([label, count]) => ({ label, count }))}
        decisionBreakdown={[
          { name: "approved", value: decisionCounts.get("approved") ?? 0, color: "#22C55E" },
          { name: "declined", value: decisionCounts.get("declined") ?? 0, color: "#EF4444" },
          { name: "referred", value: decisionCounts.get("referred") ?? 0, color: "#EAB308" },
        ]}
        weeklyRevenue={Array.from(weeklyMap.entries()).map(([week, revenue]) => ({ week, revenue }))}
        topRules={Array.from(topRulesMap.entries()).slice(0, 8).map(([name, count]) => ({ name, count, type: name.startsWith("RULE_00") ? "decline" : name.startsWith("RULE_01") ? "refer" : "approve" }))}
        stpTrend={Array.from(stpDailyMap.entries()).map(([label, value]) => ({ label, value: value.total ? (value.stp / value.total) * 100 : 0 }))}
      />
    </div>
  );
}
