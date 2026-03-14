"use client";

import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, Clock3, TrendingUp } from "lucide-react";
import Link from "next/link";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Button } from "@/components/ui/button";
import { CardSurface } from "@/components/ui/card-surface";
import { TableShell } from "@/components/ui/table-shell";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type StatusRow = { status: string; count: number };
type RecentRow = {
  id: string;
  application_number: string | null;
  applicant_name: string | null;
  status: string;
  overall_score: number | null;
  submitted_at: string | null;
};
type QueueRow = {
  id: string;
  application_number: string | null;
  applicant_name: string | null;
  overall_score: number | null;
  submitted_at: string | null;
};

const statusColor: Record<string, string> = {
  approved: "#22C55E",
  referred: "#EAB308",
  declined: "#EF4444",
  processing: "#3B82F6",
  draft: "#6B7280",
  submitted: "#3B82F6",
  cancelled: "#6B7280",
};

const riskClass = (score: number | null): string => {
  if (score === null) return "bg-slate-400/20 text-slate-300";
  if (score < 40) return "bg-status-approved/20 text-status-approved";
  if (score <= 60) return "bg-status-referred/20 text-status-referred";
  if (score <= 75) return "bg-orange-500/20 text-orange-400";
  return "bg-status-declined/20 text-status-declined";
};

const formatShortDate = (value: string | null): string => {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const formatQueueTime = (value: string | null): string => {
  if (!value) return "-";
  const diff = Date.now() - new Date(value).getTime();
  const totalMinutes = Math.max(0, Math.floor(diff / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
};

const queueTone = (value: string | null): string => {
  if (!value) return "bg-status-draft/10 text-status-draft";
  const diffHours = (Date.now() - new Date(value).getTime()) / 3600000;
  if (diffHours < 2) return "bg-status-approved/10 text-status-approved";
  if (diffHours < 4) return "bg-status-referred/10 text-status-referred";
  return "bg-status-declined/10 text-status-declined";
};

const ChartTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value?: number; payload?: { status?: string } }>;
  label?: string;
}) => {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-2xl border border-accent/20 bg-surface/95 px-4 py-3 shadow-[0_20px_60px_rgba(15,23,42,0.35)] backdrop-blur">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-accent">{label ?? payload[0]?.payload?.status ?? "Status"}</p>
      <p className="mt-1 text-lg font-semibold text-foreground">{payload[0]?.value ?? 0} applications</p>
    </div>
  );
};

export function DashboardHomeClient({
  byStatus,
  recent,
  reviewQueue,
  showQueue,
}: {
  byStatus: StatusRow[];
  recent: RecentRow[];
  reviewQueue: QueueRow[];
  showQueue: boolean;
}) {
  const totalApplications = byStatus.reduce((sum, row) => sum + row.count, 0);
  const pendingCount = byStatus.filter((row) => ["submitted", "referred", "processing"].includes(row.status)).reduce((sum, row) => sum + row.count, 0);
  const approvedCount = byStatus.find((row) => row.status === "approved")?.count ?? 0;
  const avgRisk = recent.filter((item) => item.overall_score !== null).reduce((sum, item) => sum + (item.overall_score ?? 0), 0);
  const avgRiskCount = recent.filter((item) => item.overall_score !== null).length || 1;
  const avgRiskScore = Math.round(avgRisk / avgRiskCount);

  const statCards = [
    {
      title: "Total Applications",
      value: totalApplications,
      subtitle: "Across your current underwriting pipeline",
      icon: TrendingUp,
      tone: "bg-status-processing/10 text-status-processing",
    },
    {
      title: "Pending Review",
      value: pendingCount,
      subtitle: "Submitted, processing, or referred cases",
      icon: Clock3,
      tone: "bg-status-referred/10 text-status-referred",
    },
    {
      title: "Approved Cases",
      value: approvedCount,
      subtitle: "Quotes ready to convert into premium",
      icon: CheckCircle2,
      tone: "bg-status-approved/10 text-status-approved",
    },
    {
      title: "Average Risk Score",
      value: avgRiskScore || 0,
      subtitle: "Based on the latest scored applications",
      icon: TrendingUp,
      tone: riskClass(avgRiskScore || 0),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card, index) => {
          const Icon = card.icon;

          return (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: index * 0.05 }}
            >
              <CardSurface className="h-full">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted">{card.title}</p>
                    <p className="text-3xl font-semibold tracking-tight">{card.value}</p>
                    <p className="text-sm text-muted">{card.subtitle}</p>
                  </div>
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${card.tone}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              </CardSurface>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <CardSurface className="h-full">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Applications by status</h2>
              <p className="text-sm text-muted">A live view of where work is accumulating in the pipeline.</p>
            </div>
            <span className="rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted">
              {totalApplications} total
            </span>
          </div>

          <div className="mt-6 h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byStatus} layout="vertical" margin={{ left: 8, right: 24 }}>
                <defs>
                  <linearGradient id="statusGridGlow" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#0EA5E9" stopOpacity={0.22} />
                    <stop offset="100%" stopColor="#0EA5E9" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid horizontal={false} stroke="url(#statusGridGlow)" strokeDasharray="3 6" />
                <XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: "currentColor", fontSize: 12 }} />
                <YAxis type="category" dataKey="status" width={100} axisLine={false} tickLine={false} tick={{ fill: "currentColor", fontSize: 12 }} />
                <Tooltip cursor={{ fill: "rgba(14,165,233,0.08)" }} content={<ChartTooltip />} />
                <Bar dataKey="count" radius={[6, 6, 6, 6]}>
                  {byStatus.map((item) => (
                    <Cell key={item.status} fill={statusColor[item.status] ?? "#94A3B8"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardSurface>

        <CardSurface className="h-full">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Recent applications</h2>
              <p className="text-sm text-muted">Latest submissions and scoring outcomes across the workspace.</p>
            </div>
            <Button asChild variant="ghost" className="px-0 text-accent">
              <Link href="/applications">
                View all
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="mt-6 space-y-3">
            {recent.map((item) => (
              <Link
                key={item.id}
                href={`/applications/${item.id}`}
                className="block rounded-2xl border border-border bg-background/70 p-4 transition hover:-translate-y-0.5 hover:border-accent/30 hover:shadow-sm"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0 space-y-1">
                    <p className="truncate font-mono text-sm font-medium text-accent">{item.application_number ?? "Draft"}</p>
                    <p className="truncate text-sm font-medium">{item.applicant_name ?? "Unknown"}</p>
                    <p className="text-xs text-muted">{formatShortDate(item.submitted_at)}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="rounded-full bg-background px-3 py-1 text-xs capitalize text-muted">{item.status}</span>
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${riskClass(item.overall_score)}`}>
                      {item.overall_score ?? "-"}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </CardSurface>
      </div>

      {showQueue ? (
        <CardSurface>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Review queue</h2>
              <p className="text-sm text-muted">Cases waiting for an underwriter decision, ordered by urgency.</p>
            </div>
            <Button asChild variant="outline">
              <Link href="/underwriting">Open queue</Link>
            </Button>
          </div>

          <div className="mt-6">
            <TableShell>
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-surface [&_tr]:border-b [&_tr]:border-border">
                  <TableRow className="hover:bg-transparent">
                    <TableHead>App #</TableHead>
                    <TableHead>Applicant</TableHead>
                    <TableHead>Risk Score</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Waiting</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reviewQueue.map((item) => {
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono text-accent">{item.application_number ?? "-"}</TableCell>
                        <TableCell>{item.applicant_name ?? "Unknown"}</TableCell>
                        <TableCell>
                          <span className={`rounded-full px-3 py-1 text-xs font-medium ${riskClass(item.overall_score)}`}>{item.overall_score ?? "-"}</span>
                        </TableCell>
                        <TableCell>{formatShortDate(item.submitted_at)}</TableCell>
                        <TableCell>
                          <span className={`rounded-full px-3 py-1 text-xs font-medium ${queueTone(item.submitted_at)}`}>{formatQueueTime(item.submitted_at)}</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/applications/${item.id}`}>Review</Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableShell>
          </div>
        </CardSurface>
      ) : null}
    </div>
  );
}
