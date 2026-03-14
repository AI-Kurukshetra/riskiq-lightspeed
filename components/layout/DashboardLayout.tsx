"use client";

import type { ReactNode } from "react";
import { useState } from "react";

import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import type { UserRole } from "@/types";

type DashboardProfile = {
  id: string;
  full_name: string;
  role: UserRole;
  organization_id: string;
  avatar_url: string | null;
};

type DashboardLayoutProps = {
  children: ReactNode;
  pendingCount: number;
  profile: DashboardProfile;
};

export function DashboardLayout({ children, pendingCount, profile }: DashboardLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen soft-gradient text-foreground">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[240px] md:block">
        <Sidebar profile={profile} pendingCount={pendingCount} />
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[240px] border-none p-0">
          <Sidebar profile={profile} pendingCount={pendingCount} onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="md:ml-[240px]">
        <Header profile={profile} onOpenMobileNav={() => setMobileOpen(true)} />
        <main className="pt-16">
          <div className="mx-auto flex w-full max-w-screen-xl flex-col gap-6 p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
