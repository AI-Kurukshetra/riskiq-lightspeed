import { FileX } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createServerClient } from "@/lib/supabase/server";

const statusClass = (status: string): string => {
  if (status === "accepted") return "bg-status-approved/20 text-status-approved";
  if (status === "draft") return "bg-status-draft/20 text-status-draft";
  if (status === "declined") return "bg-status-declined/20 text-status-declined";
  return "bg-status-referred/20 text-status-referred";
};

export default async function QuotesPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("organization_id").eq("id", user.id).single();
  if (!profile) redirect("/login");

  const { data: applications } = await supabase
    .from("applications")
    .select("id,application_number,applicant_name")
    .eq("organization_id", profile.organization_id);

  const appMap = new Map((applications ?? []).map((item) => [item.id, item]));

  const { data: quotes } = await supabase
    .from("quotes")
    .select("id,application_id,quote_number,coverage_type,final_premium,status,valid_until")
    .order("created_at", { ascending: false });

  const filtered = (quotes ?? []).filter((quote) => appMap.has(quote.application_id));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-3xl">Quotes</h1>
        <p className="text-sm text-muted">Generated quotes and status tracking.</p>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-card border border-border bg-surface p-10 text-center">
          <FileX className="mx-auto h-8 w-8 text-muted" />
          <p className="mt-2 text-sm">No quotes available yet.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-card border border-border bg-surface">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quote #</TableHead>
                <TableHead>Application #</TableHead>
                <TableHead>Applicant</TableHead>
                <TableHead>Coverage</TableHead>
                <TableHead>Final Premium</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Valid Until</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((quote) => {
                const app = appMap.get(quote.application_id);
                return (
                  <TableRow key={quote.id}>
                    <TableCell className="font-mono text-accent">{quote.quote_number ?? "Pending"}</TableCell>
                    <TableCell className="font-mono">{app?.application_number ?? "-"}</TableCell>
                    <TableCell>{app?.applicant_name ?? "Unknown"}</TableCell>
                    <TableCell><span className="rounded-full bg-accent/20 px-2 py-0.5 text-xs text-accent">{quote.coverage_type}</span></TableCell>
                    <TableCell>₹{Number(quote.final_premium ?? 0).toLocaleString("en-IN")}</TableCell>
                    <TableCell><span className={`rounded-full px-2 py-0.5 text-xs ${statusClass(quote.status)}`}>{quote.status}</span></TableCell>
                    <TableCell>{quote.valid_until ? new Date(quote.valid_until).toLocaleDateString("en-IN") : "-"}</TableCell>
                    <TableCell><Button asChild size="sm" variant="outline"><Link href={`/quotes/${quote.id}`}>View</Link></Button></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
