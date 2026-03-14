"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { toggleRule } from "@/actions/underwriting";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

interface RuleRow {
  id: string;
  name: string;
  description: string | null;
  rule_type: "decline" | "refer" | "approve" | "pricing_modifier";
  priority: number;
  is_active: boolean;
}

export default function RulesPage() {
  const router = useRouter();
  const [rules, setRules] = useState<RuleRow[]>([]);
  const [role, setRole] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const load = async (): Promise<void> => {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) {
        router.push("/login");
        return;
      }

      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
      if (!profile || profile.role !== "admin") {
        router.push("/dashboard");
        return;
      }

      setRole(profile.role);
      const { data } = await supabase.from("underwriting_rules").select("id,name,description,rule_type,priority,is_active").order("priority", { ascending: true });
      setRules((data ?? []) as RuleRow[]);
    };

    void load();
  }, [router]);

  const grouped = useMemo(() => ({
    decline: rules.filter((item) => item.rule_type === "decline"),
    refer: rules.filter((item) => item.rule_type === "refer"),
    approve: rules.filter((item) => item.rule_type === "approve"),
  }), [rules]);

  if (role !== "admin") return null;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-heading text-3xl">Rules Engine</h1>
        <p className="text-sm text-muted">Configure automated underwriting rules.</p>
        <p className="mt-1 text-xs text-muted">Rules are evaluated in priority order — lower number = checked first.</p>
      </div>

      {([
        ["Decline Rules", "decline", "text-status-declined"],
        ["Refer Rules", "refer", "text-status-referred"],
        ["Approve Rules", "approve", "text-status-approved"],
      ] as const).map(([title, key, color]) => (
        <section key={key} className="rounded-card border border-border bg-surface p-4">
          <h2 className={`font-heading text-2xl ${color}`}>{title}</h2>
          <div className="mt-3 space-y-2">
            {grouped[key].map((rule) => (
              <div key={rule.id} className="flex flex-wrap items-center gap-3 rounded border border-border p-3 text-sm">
                <span className="rounded bg-background px-2 py-0.5 font-mono text-xs">{rule.name}</span>
                <span className="flex-1">{rule.description}</span>
                <span className="rounded bg-accent/20 px-2 py-0.5 text-xs text-accent">Priority {rule.priority}</span>
                <Switch
                  checked={rule.is_active}
                  onCheckedChange={(value) => {
                    setRules((prev) => prev.map((item) => item.id === rule.id ? { ...item, is_active: value } : item));
                    startTransition(() => {
                      void toggleRule(rule.id, value);
                    });
                  }}
                />
                <Dialog>
                  <DialogTrigger asChild><Button variant="outline" size="sm">Edit</Button></DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Edit rule</DialogTitle></DialogHeader>
                    <p className="text-sm text-muted">Placeholder form for rule editing.</p>
                  </DialogContent>
                </Dialog>
              </div>
            ))}
          </div>
        </section>
      ))}

      {isPending ? <p className="text-xs text-muted">Updating rule...</p> : null}
    </div>
  );
}
