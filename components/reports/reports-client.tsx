"use client";

import { Area, AreaChart, Bar, BarChart, Cell, Line, LineChart, Pie, PieChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Kpi = {
  totalApplications: number;
  stpRate: number;
  avgProcessingSeconds: number;
  totalPremiumWritten: number;
  trend: number;
};

type Props = {
  kpi: Kpi;
  daily: Array<{ label: string; count: number }>;
  decisionBreakdown: Array<{ name: string; value: number; color: string }>;
  weeklyRevenue: Array<{ week: string; revenue: number }>;
  topRules: Array<{ name: string; count: number; type: string }>;
  stpTrend: Array<{ label: string; value: number }>;
};

const formatMoney = (value: number): string => `₹${Math.round(value).toLocaleString("en-IN")}`;

const compactMoney = (value: number): string => {
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)}Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(2)}L`;
  return formatMoney(value);
};

export const ReportsClient = ({ kpi, daily, decisionBreakdown, weeklyRevenue, topRules, stpTrend }: Props) => {
  const totalDecisions = decisionBreakdown.reduce((acc, row) => acc + row.value, 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-card border border-border bg-surface p-6">
          <p className="text-sm text-muted">Total Applications (30d)</p>
          <p className="mt-2 font-heading text-3xl">{kpi.totalApplications}</p>
          <p className={`text-xs ${kpi.trend >= 0 ? "text-status-approved" : "text-status-declined"}`}>{kpi.trend >= 0 ? "+" : ""}{kpi.trend}% vs previous 30d</p>
        </div>
        <div className="rounded-card border border-border bg-surface p-6">
          <p className="text-sm text-muted">STP Rate</p>
          <p className="mt-2 font-heading text-3xl">{kpi.stpRate.toFixed(1)}%</p>
          <p className="text-xs text-muted">Target: 70%</p>
        </div>
        <div className="rounded-card border border-border bg-surface p-6">
          <p className="text-sm text-muted">Avg Processing Time</p>
          <p className={`mt-2 font-heading text-3xl ${kpi.avgProcessingSeconds < 5 ? "text-status-approved" : kpi.avgProcessingSeconds > 10 ? "text-status-declined" : "text-status-referred"}`}>{kpi.avgProcessingSeconds.toFixed(1)}s</p>
        </div>
        <div className="rounded-card border border-border bg-surface p-6">
          <p className="text-sm text-muted">Total Premium Written</p>
          <p className="mt-2 font-heading text-3xl">{compactMoney(kpi.totalPremiumWritten)}</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-card border border-border bg-surface p-5">
          <h3 className="font-heading text-2xl">Daily Applications — Last 14 Days</h3>
          <div className="mt-4 h-60">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={daily}>
                <XAxis dataKey="label" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#0EA5E9" strokeWidth={2} dot={{ fill: "#0EA5E9" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-card border border-border bg-surface p-5">
          <h3 className="font-heading text-2xl">Decision Breakdown</h3>
          <div className="mt-4 h-60">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={decisionBreakdown} dataKey="value" innerRadius={55} outerRadius={85}>
                  {decisionBreakdown.map((row) => <Cell key={row.name} fill={row.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <p className="text-center text-sm text-muted">Total decisions: {totalDecisions}</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-card border border-border bg-surface p-5">
          <h3 className="font-heading text-2xl">Weekly Premium Revenue — Last 8 Weeks</h3>
          <div className="mt-4 h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyRevenue}>
                <XAxis dataKey="week" />
                <YAxis />
                <Tooltip formatter={(value) => formatMoney(Number(value))} />
                <Bar dataKey="revenue" fill="#0EA5E9" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-card border border-border bg-surface p-5">
          <h3 className="font-heading text-2xl">Most Triggered Rules</h3>
          <div className="mt-4 h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topRules} layout="vertical">
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={80} />
                <Tooltip />
                <Bar dataKey="count">
                  {topRules.map((rule) => (
                    <Cell key={rule.name} fill={rule.type === "decline" ? "#EF4444" : rule.type === "refer" ? "#EAB308" : "#22C55E"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="rounded-card border border-border bg-surface p-5">
        <h3 className="font-heading text-2xl">STP Rate Trend</h3>
        <div className="mt-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={stpTrend.length ? stpTrend : [{ label: "D1", value: 52 }, { label: "D2", value: 58 }, { label: "D3", value: 65 }]}>
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip />
              <ReferenceLine y={70} strokeDasharray="4 4" stroke="#94A3B8" />
              <Area type="monotone" dataKey="value" stroke="#0EA5E9" fill="#0EA5E9" fillOpacity={0.2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        {!stpTrend.length ? <p className="text-xs text-muted">Sample data — will update as applications are processed</p> : null}
      </div>
    </div>
  );
};
