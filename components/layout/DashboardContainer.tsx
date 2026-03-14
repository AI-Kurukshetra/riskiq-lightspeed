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

type DashboardContainerProps = {
  children: ReactNode;
  pendingCount: number;
  profile: DashboardProfile;
};

export const DashboardContainer = ({ children, pendingCount, profile }: DashboardContainerProps) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[240px] md:block">
        <Sidebar profile={profile} pendingCount={pendingCount} />
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[240px] border-none p-0">
          <Sidebar profile={profile} pendingCount={pendingCount} onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="md:pl-[240px]">
        <Header
          profile={{
            id: profile.id,
            full_name: profile.full_name,
            role: profile.role,
            avatar_url: profile.avatar_url,
          }}
          onOpenMobileNav={() => setMobileOpen(true)}
        />
        <main className="pt-16">
          <div className="mx-auto w-full max-w-screen-xl p-6 space-y-6">{children}</div>
        </main>
      </div>
    </div>
  );
};
