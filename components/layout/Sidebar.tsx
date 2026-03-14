"use client";

import {
  BarChart3,
  ClipboardList,
  FileText,
  LayoutDashboard,
  LogOut,
  Receipt,
  Shield,
  ShieldCheck,
  SlidersHorizontal,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types";

type SidebarProfile = {
  id: string;
  full_name: string;
  role: UserRole;
  avatar_url: string | null;
};

type SidebarProps = {
  profile: SidebarProfile;
  pendingCount?: number;
  onNavigate?: () => void;
};

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  roles: UserRole[];
  showBadge?: boolean;
};

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["super_admin", "admin", "underwriter", "agent", "compliance_officer"] },
  { href: "/applications", label: "Applications", icon: FileText, roles: ["super_admin", "admin", "underwriter", "agent", "compliance_officer"], showBadge: true },
  { href: "/underwriting", label: "Underwriting", icon: ShieldCheck, roles: ["super_admin", "admin", "underwriter"] },
  { href: "/quotes", label: "Quotes", icon: Receipt, roles: ["super_admin", "admin", "underwriter", "agent", "compliance_officer"] },
  { href: "/rules", label: "Rules Engine", icon: SlidersHorizontal, roles: ["super_admin", "admin"] },
  { href: "/reports", label: "Reports", icon: BarChart3, roles: ["super_admin", "admin", "underwriter"] },
  { href: "/audit", label: "Audit Trail", icon: ClipboardList, roles: ["super_admin", "admin", "compliance_officer"] },
];

const roleBadgeClass: Record<UserRole, string> = {
  super_admin: "bg-emerald-500/20 text-emerald-300",
  admin: "bg-emerald-500/20 text-emerald-300",
  underwriter: "bg-violet-500/20 text-violet-300",
  agent: "bg-sky-500/20 text-sky-300",
  compliance_officer: "bg-orange-500/20 text-orange-200",
};

export function Sidebar({ profile, pendingCount = 0, onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const initials = profile.full_name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const handleSignOut = async (): Promise<void> => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  };

  return (
    <div className="flex h-full w-[240px] flex-col bg-[#0F172A] px-4 py-6 text-white">
      <div className="border-b border-white/10 pb-5">
        <div className="flex items-center gap-3 px-2">
          <div className="rounded-xl bg-white/5 p-2">
            <Shield className="h-5 w-5 text-accent" />
          </div>
          <div>
            <span className="font-heading text-xl text-white">RiskIQ</span>
            <p className="text-xs text-slate-400">Underwriting OS</p>
          </div>
        </div>
      </div>

      <nav className="min-h-0 flex-1 space-y-2 overflow-y-auto py-6">
        {navItems
          .filter((item) => item.roles.includes(profile.role))
          .map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  "group flex items-center justify-between gap-3 rounded-lg border-l-4 px-3 py-2.5 text-sm transition-all duration-150",
                  active
                    ? "border-accent bg-white/10 text-white shadow-lg shadow-black/10"
                    : "border-transparent text-slate-400 hover:bg-white/5 hover:text-white",
                )}
              >
                <span className="flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  {item.label}
                </span>
                {item.showBadge && pendingCount > 0 ? (
                  <span className="rounded-full bg-status-referred px-2 py-0.5 text-[11px] font-medium text-black">{pendingCount}</span>
                ) : null}
              </Link>
            );
          })}
      </nav>

      <div className="border-t border-white/10 pt-4">
        <div className="mb-4 flex items-center gap-3 rounded-xl bg-white/5 p-3">
          {profile.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatar_url} alt={profile.full_name} className="h-10 w-10 rounded-full object-cover" />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-sm font-semibold text-white">{initials}</div>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{profile.full_name}</p>
            <span className={cn("inline-block rounded-full px-2 py-0.5 text-xs capitalize", roleBadgeClass[profile.role])}>
              {profile.role.replaceAll("_", " ")}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            void handleSignOut();
          }}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/15 px-3 py-2.5 text-sm text-slate-200 hover:bg-white/10"
        >
          <LogOut className="h-4 w-4" />
          Log Out
        </button>
      </div>
    </div>
  );
}
