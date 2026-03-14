"use client";

import { FileX, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { CardSurface } from "@/components/ui/card-surface";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TableShell } from "@/components/ui/table-shell";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Row = {
  id: string;
  application_number: string | null;
  applicant_name: string | null;
  status: string;
  submitted_at: string | null;
  vehicle_make: string;
  vehicle_model: string;
  overall_score: number | null;
  risk_level: string | null;
};

const statusBadgeClass = (status: string): string => {
  if (status === "approved") return "bg-status-approved/20 text-status-approved";
  if (status === "referred") return "bg-status-referred/20 text-status-referred";
  if (status === "declined") return "bg-status-declined/20 text-status-declined";
  if (status === "processing") return "bg-status-processing/20 text-status-processing";
  return "bg-status-draft/20 text-status-draft";
};

const riskBadgeClass = (score: number | null): string => {
  if (score === null) return "bg-slate-500/20 text-slate-300";
  if (score < 40) return "bg-status-approved/20 text-status-approved";
  if (score <= 60) return "bg-status-referred/20 text-status-referred";
  if (score <= 75) return "bg-orange-500/20 text-orange-300";
  return "bg-status-declined/20 text-status-declined";
};

const riskLabel = (level: string | null): string => {
  if (!level) return "unknown";
  return level.replaceAll("_", " ");
};

export function ApplicationsTableClient({ rows }: { rows: Row[] }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const router = useRouter();

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      const matchesSearch = [row.applicant_name ?? "", row.application_number ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase());
      const matchesStatus = status === "all" || row.status === status;
      return matchesSearch && matchesStatus;
    });
  }, [rows, search, status]);

  return (
    <div className="space-y-6">
      <CardSurface>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex w-full flex-col gap-3 md:flex-row md:items-center lg:max-w-2xl">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by applicant or application #"
                className="pl-9"
              />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-full md:w-52">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {["draft", "submitted", "processing", "approved", "declined", "referred", "cancelled"].map((item) => (
                  <SelectItem key={item} value={item} className="capitalize">
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button asChild className="bg-accent text-white hover:bg-accent/90">
            <Link href="/applications/new">New Application</Link>
          </Button>
        </div>
      </CardSurface>

      {filtered.length === 0 ? (
        <CardSurface className="text-center">
          <FileX className="mx-auto h-8 w-8 text-muted" />
          <p className="mt-2 text-sm">No applications found</p>
          {search || status !== "all" ? (
            <Button
              variant="ghost"
              className="mt-3"
              onClick={() => {
                setSearch("");
                setStatus("all");
              }}
            >
              Clear filters
            </Button>
          ) : null}
        </CardSurface>
      ) : (
        <TableShell>
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-surface [&_tr]:border-b [&_tr]:border-border">
              <TableRow className="hover:bg-transparent">
                <TableHead>Application #</TableHead>
                <TableHead>Applicant</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Risk Score</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((row) => (
                <TableRow key={row.id} className="cursor-pointer" onClick={() => router.push(`/applications/${row.id}`)}>
                  <TableCell className="font-mono text-accent">{row.application_number ?? "Draft"}</TableCell>
                  <TableCell>{row.applicant_name ?? "Unknown"}</TableCell>
                  <TableCell>{`${row.vehicle_make} ${row.vehicle_model}`.trim() || "-"}</TableCell>
                  <TableCell>
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs capitalize ${riskBadgeClass(row.overall_score)}`}>
                      {row.overall_score ?? "-"} {row.risk_level ? `• ${riskLabel(row.risk_level)}` : ""}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs capitalize ${statusBadgeClass(row.status)}`}>{row.status}</span>
                  </TableCell>
                  <TableCell>
                    {row.submitted_at
                      ? new Date(row.submitted_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                      : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    {row.status === "draft" ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(event) => {
                          event.stopPropagation();
                          router.push(`/applications/new?draft=${row.id}`);
                        }}
                      >
                        Complete
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(event) => {
                          event.stopPropagation();
                          router.push(`/applications/${row.id}`);
                        }}
                      >
                        View
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableShell>
      )}
    </div>
  );
}
