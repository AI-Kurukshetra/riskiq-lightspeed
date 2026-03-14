"use client";

import {
  AlertTriangle,
  Bell,
  CheckCheck,
  ChevronDown,
  FileText,
  Menu,
  Moon,
  ReceiptText,
  ShieldCheck,
  Sun,
} from "lucide-react";
import { useTheme } from "next-themes";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types";

type HeaderProfile = {
  id: string;
  full_name: string;
  role: UserRole;
  avatar_url: string | null;
};

type NotificationRow = {
  id: string;
  title: string;
  message: string | null;
  type: "new_application" | "decision_made" | "quote_ready" | "exception_flagged";
  link_url: string | null;
  is_read: boolean;
  created_at: string;
};

const iconByType = {
  new_application: FileText,
  decision_made: ShieldCheck,
  quote_ready: ReceiptText,
  exception_flagged: AlertTriangle,
};

const timeAgo = (value: string): string => {
  const diff = Math.max(0, Date.now() - new Date(value).getTime());
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

const formatSegment = (segment: string): string =>
  segment
    .replaceAll("-", " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());

export function Header({ profile, onOpenMobileNav }: { profile: HeaderProfile; onOpenMobileNav: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);

  const breadcrumbs = useMemo(() => {
    const parts = pathname.split("/").filter(Boolean);
    if (parts.length === 0) return ["Dashboard"];
    return parts.map((part) => formatSegment(part));
  }, [pathname]);

  const pageTitle = breadcrumbs[breadcrumbs.length - 1] ?? "Dashboard";

  useEffect(() => {
    const load = async (): Promise<void> => {
      const supabase = createClient();
      const { data } = await supabase
        .from("notifications")
        .select("id,title,message,type,link_url,is_read,created_at")
        .eq("recipient_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(5);

      if (data) setNotifications(data as NotificationRow[]);
    };

    void load();
  }, [profile.id]);

  const unreadCount = notifications.filter((item) => !item.is_read).length;

  const markAllRead = async (): Promise<void> => {
    const supabase = createClient();
    await supabase.from("notifications").update({ is_read: true }).eq("recipient_id", profile.id).eq("is_read", false);
    setNotifications((prev) => prev.map((item) => ({ ...item, is_read: true })));
  };

  const onNotificationClick = async (notification: NotificationRow): Promise<void> => {
    const supabase = createClient();
    await supabase.from("notifications").update({ is_read: true }).eq("id", notification.id);
    setNotifications((prev) => prev.map((item) => (item.id === notification.id ? { ...item, is_read: true } : item)));
    if (notification.link_url) router.push(notification.link_url);
  };

  const initials = profile.full_name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const handleLogout = async (): Promise<void> => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  };

  return (
    <header className="fixed inset-x-0 top-0 z-30 h-16 border-b border-border bg-surface/90 shadow-sm backdrop-blur-xl md:left-[240px]">
      <div className="flex h-full items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-background text-foreground transition hover:-translate-y-0.5 hover:border-accent/50 hover:bg-surface md:hidden"
            onClick={onOpenMobileNav}
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-muted">
              <span className="rounded-full border border-border bg-background px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.2em] text-accent">
                RiskIQ
              </span>
              <span>/</span>
              <span>{breadcrumbs.join(" / ")}</span>
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">{pageTitle}</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-background transition hover:-translate-y-0.5 hover:border-accent/50 hover:bg-surface"
                aria-label="Notifications"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 ? (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-status-declined px-1 text-[10px] text-white">
                    {unreadCount}
                  </span>
                ) : null}
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-[22rem] border-border bg-surface p-3 shadow-card">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">Notifications</p>
                  <p className="text-xs text-muted">Latest underwriting updates</p>
                </div>
                {unreadCount > 0 ? (
                  <span className="rounded-full bg-status-declined/10 px-2 py-1 text-[11px] font-medium text-status-declined">
                    {unreadCount} new
                  </span>
                ) : null}
              </div>

              <div className="space-y-2">
                {notifications.map((notification) => {
                  const Icon = iconByType[notification.type] ?? Bell;
                  return (
                    <button
                      key={notification.id}
                      type="button"
                      className={cn(
                        "w-full rounded-xl border px-3 py-3 text-left transition hover:-translate-y-0.5 hover:shadow-sm",
                        notification.is_read ? "border-border/60 bg-background/60" : "border-accent/30 bg-accent/10",
                      )}
                      onClick={() => {
                        void onNotificationClick(notification);
                      }}
                    >
                      <div className="flex items-start gap-2">
                        <Icon className="mt-0.5 h-4 w-4 text-accent" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{notification.title}</p>
                          <p className="truncate text-xs text-muted">{notification.message ?? "No details"}</p>
                          <p className="mt-1 text-[11px] text-muted">{timeAgo(notification.created_at)}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
              <Button variant="ghost" className="mt-3 w-full justify-center" onClick={() => void markAllRead()}>
                <CheckCheck className="mr-2 h-4 w-4" /> Mark all read
              </Button>
            </PopoverContent>
          </Popover>

          <button
            type="button"
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-background transition hover:-translate-y-0.5 hover:border-accent/50 hover:bg-surface"
            aria-label="Toggle theme"
          >
            <Sun className="hidden h-4 w-4 dark:block" />
            <Moon className="h-4 w-4 dark:hidden" />
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-3 rounded-xl border border-border bg-background px-2 py-1.5 transition hover:-translate-y-0.5 hover:border-accent/50 hover:bg-surface"
                aria-label="User menu"
              >
                <Avatar className="h-7 w-7">
                  <AvatarImage src={profile.avatar_url ?? undefined} alt={profile.full_name} />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <div className="hidden text-left sm:block">
                  <p className="max-w-[140px] truncate text-sm font-medium text-foreground">{profile.full_name}</p>
                  <p className="text-xs capitalize text-muted">{profile.role.replaceAll("_", " ")}</p>
                </div>
                <ChevronDown className="h-4 w-4 text-muted" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem className="capitalize" disabled>
                {profile.role.replaceAll("_", " ")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  void handleLogout();
                }}
              >
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
