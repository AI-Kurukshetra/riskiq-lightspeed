import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { createServerClient } from "@/lib/supabase/server";

export default async function DashboardRouteLayout({ children }: { children: ReactNode }) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id,full_name,organization_id,role,avatar_url")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/login");
  }

  const { data: pendingRows } = await supabase
    .from("applications")
    .select("id")
    .eq("organization_id", profile.organization_id)
    .in("status", ["submitted", "referred"]);

  const pendingCount = pendingRows?.length ?? 0;

  return (
    <DashboardLayout profile={profile} pendingCount={pendingCount}>
      {children}
    </DashboardLayout>
  );
}
