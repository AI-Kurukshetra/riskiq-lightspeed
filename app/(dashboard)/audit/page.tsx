"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

type Row = {
  id: string;
  created_at: string;
  action_type: string;
  entity_type: string;
  entity_id: string | null;
  new_value: Record<string, unknown> | null;
  actor_name: string;
};

const humanize = (value: string): string => value.toLowerCase().split("_").map((v) => v[0].toUpperCase() + v.slice(1)).join(" ");

export default function AuditPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("all");
  const [role, setRole] = useState("");

  useEffect(() => {
    const load = async (): Promise<void> => {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        router.push("/login");
        return;
      }

      const { data: profile } = await supabase.from("profiles").select("role,organization_id").eq("id", userData.user.id).single();
      if (!profile || !["admin", "compliance_officer", "super_admin"].includes(profile.role)) {
        router.push("/dashboard");
        return;
      }

      setRole(profile.role);
      const { data: logs } = await supabase.from("audit_logs").select("id,created_at,action_type,entity_type,entity_id,new_value,performed_by").order("created_at", { ascending: false }).limit(300);
      const actorIds = Array.from(new Set((logs ?? []).map((log) => log.performed_by).filter(Boolean)));
      const { data: actors } = actorIds.length ? await supabase.from("profiles").select("id,full_name").in("id", actorIds) : { data: [] };
      const map = new Map((actors ?? []).map((actor) => [actor.id, actor.full_name]));

      setRows((logs ?? []).map((log) => ({
        ...log,
        actor_name: log.performed_by ? map.get(log.performed_by) ?? "User" : "System",
      })) as Row[]);
    };

    void load();
  }, [router]);

  const filtered = useMemo(() => rows.filter((row) => {
    const searchText = `${row.action_type} ${row.entity_type} ${row.entity_id ?? ""} ${row.actor_name}`.toLowerCase();
    const matchSearch = searchText.includes(search.toLowerCase());
    const matchAction = action === "all" || row.action_type === action;
    return matchSearch && matchAction;
  }), [rows, search, action]);

  if (!role) return null;

  const pageRows = filtered.slice(0, 25);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-3xl">Audit Trail</h1>
        <p className="text-sm text-muted">Complete log of all system actions.</p>
      </div>

      <div className="flex flex-col gap-2 md:flex-row">
        <Input placeholder="Search logs..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <Select value={action} onValueChange={setAction}>
          <SelectTrigger className="md:w-60"><SelectValue placeholder="Action Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            {Array.from(new Set(rows.map((row) => row.action_type))).map((item) => (
              <SelectItem key={item} value={item}>{humanize(item)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-card border border-border bg-surface">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>Performed By</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{new Date(row.created_at).toLocaleString("en-IN")}</TableCell>
                <TableCell>{humanize(row.action_type)}</TableCell>
                <TableCell>{row.entity_type} <span className="font-mono text-xs text-muted">{row.entity_id?.slice(-8)}</span></TableCell>
                <TableCell>{row.actor_name}</TableCell>
                <TableCell>
                  <Dialog>
                    <DialogTrigger asChild><Button variant="outline" size="sm">Details</Button></DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader><DialogTitle>Audit Details</DialogTitle></DialogHeader>
                      <pre className="max-h-[420px] overflow-auto rounded border border-border bg-background p-3 text-xs">{JSON.stringify(row.new_value ?? {}, null, 2)}</pre>
                    </DialogContent>
                  </Dialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted">Showing {pageRows.length} of {filtered.length} records</p>
    </div>
  );
}
