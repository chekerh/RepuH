"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { applyTheme } from "@/components/theme-toggle";
import {
  Activity,
  Award,
  Compass,
  Fingerprint,
  Target,
  Gauge,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Settings,
  Trophy,
  User,
  Waypoints,
} from "lucide-react";
import type { SessionUser } from "@/lib/domain/types";
import { Wordmark } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn, initials } from "@/lib/utils";

const PRIMARY = [
  { href: "/assistant", label: "Assistant", icon: MessageSquare },
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/fingerprint", label: "My Fingerprint", icon: Fingerprint },
  { href: "/roles", label: "Role coverage", icon: Target },
  { href: "/activity", label: "Activity", icon: Activity },
  { href: "/evidence", label: "Evidence", icon: Waypoints },
  { href: "/certificates", label: "Certificates", icon: Award },
  { href: "/leaderboards", label: "Leaderboards", icon: Trophy },
  { href: "/explore", label: "Explore", icon: Compass },
];

const MOBILE = [
  { href: "/assistant", label: "Assistant", icon: MessageSquare },
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/fingerprint", label: "Fingerprint", icon: Fingerprint },
  { href: "/activity", label: "Activity", icon: Activity },
  { href: "/evidence", label: "Evidence", icon: Waypoints },
  { href: "/certificates", label: "Certificates", icon: Award },
  { href: "/leaderboards", label: "Rankings", icon: Trophy },
];

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({
  user,
  demo,
  observing,
  admin = false,
  children,
}: {
  user: SessionUser;
  demo: boolean;
  /** True only when a provider is actually connected; a new account has none. */
  observing: boolean;
  /** True only for emails on REPUH_ADMIN_EMAILS; hides the link for everyone else. */
  admin?: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  useEffect(() => {
    const stored = (user as { preferences?: { theme?: string } }).preferences?.theme;
    if (stored === "light" || stored === "dark" || stored === "system") {
      applyTheme(stored);
    }
  }, [user]);
  const router = useRouter();
  const profileHref = `/u/${user.profile.username}`;

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[15rem_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-border bg-surface lg:flex">
        <div className="px-5 py-5">
          <Wordmark />
        </div>

        <nav aria-label="Primary" className="flex-1 px-3">
          <ul className="space-y-0.5">
            {PRIMARY.map((item) => {
              const Icon = item.icon;
              const active = isActive(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-2.5 rounded-sm px-2.5 py-2 text-[0.8125rem] transition-colors",
                      active
                        ? "bg-surface-muted font-medium text-foreground"
                        : "text-muted hover:bg-surface-muted hover:text-foreground",
                    )}
                  >
                    <Icon
                      size={16}
                      strokeWidth={1.75}
                      className={active ? "text-primary" : "text-muted"}
                    />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="my-4 h-px bg-border" />

          <ul className="space-y-0.5">
            <li>
              <Link
                href="/integrations"
                aria-current={isActive(pathname, "/integrations") ? "page" : undefined}
                className={cn(
                  "flex items-center justify-between rounded-sm px-2.5 py-2 text-[0.8125rem] transition-colors",
                  isActive(pathname, "/integrations")
                    ? "bg-surface-muted font-medium text-foreground"
                    : "text-muted hover:bg-surface-muted hover:text-foreground",
                )}
              >
                <span className="flex items-center gap-2.5">
                  <Waypoints size={16} strokeWidth={1.75} />
                  Integrations
                </span>
                {demo ? (
                  <span className="rounded-xs border border-warning/40 bg-warning/10 px-1 py-px text-[0.5625rem] font-semibold tracking-wide text-warning">
                    DEMO
                  </span>
                ) : null}
              </Link>
            </li>
            <li>
              <Link
                href="/help"
                className="flex items-center gap-2.5 rounded-sm px-2.5 py-2 text-[0.8125rem] text-muted transition-colors hover:bg-surface-muted hover:text-foreground"
              >
                <HelpCircle size={16} strokeWidth={1.75} />
                Help
              </Link>
            </li>
            {admin ? (
              <li>
                <Link
                  href="/admin"
                  aria-current={isActive(pathname, "/admin") ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-2.5 rounded-sm px-2.5 py-2 text-[0.8125rem] transition-colors",
                    isActive(pathname, "/admin")
                      ? "bg-surface-muted font-medium text-foreground"
                      : "text-muted hover:bg-surface-muted hover:text-foreground",
                  )}
                >
                  <Gauge size={16} strokeWidth={1.75} />
                  Admin
                </Link>
              </li>
            ) : null}
            <li>
              <Link
                href="/settings"
                aria-current={isActive(pathname, "/settings") ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-sm px-2.5 py-2 text-[0.8125rem] transition-colors",
                  isActive(pathname, "/settings")
                    ? "bg-surface-muted font-medium text-foreground"
                    : "text-muted hover:bg-surface-muted hover:text-foreground",
                )}
              >
                <Settings size={16} strokeWidth={1.75} />
                Settings
              </Link>
            </li>
            <li>
              <Link
                href={profileHref}
                className="flex items-center gap-2.5 rounded-sm px-2.5 py-2 text-[0.8125rem] text-muted transition-colors hover:bg-surface-muted hover:text-foreground"
              >
                <User size={16} strokeWidth={1.75} />
                Public profile
              </Link>
            </li>
          </ul>
        </nav>

        <div className="border-t border-border p-3">
          <div className="flex items-center gap-2.5 rounded-sm px-1.5 py-1.5">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary-soft text-[0.6875rem] font-semibold text-primary">
              {initials(user.profile.displayName)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[0.8125rem] font-medium leading-tight">
                {user.profile.displayName}
              </p>
              <p className="truncate text-xs text-muted">@{user.profile.username}</p>
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between px-1">
            <span className="text-[0.6875rem] text-muted">
              {user.profile.visibility === "public"
                ? "Public profile"
                : user.profile.visibility === "selective"
                  ? "Selectively shared"
                  : "Private profile"}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => void signOut()}
                className="rounded-xs px-2 py-1 text-xs text-muted transition-colors hover:text-foreground"
                aria-label="Sign out"
              >
                <LogOut size={13} />
              </button>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </aside>

      <div className="flex min-h-dvh flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b border-border bg-background/95 px-4 lg:px-8">
          <div className="flex items-center gap-3 lg:hidden">
            <Wordmark compact />
          </div>
          <div className="hidden items-center gap-2 lg:flex">
            <span className="inline-flex items-center gap-1.5 text-xs text-muted">
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  demo ? "bg-warning" : observing ? "bg-success" : "bg-muted",
                )}
                aria-hidden
              />
              {demo
                ? "Development adapter — labelled demo data"
                : observing
                  ? "Observation active"
                  : "Not observing"}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Link
              href="/settings#observation"
              className="hidden rounded-xs px-2 py-1 text-xs text-muted transition-colors hover:text-foreground sm:block"
            >
              Observation status
            </Link>
            <span className="hidden sm:block">
              <ThemeToggle compact />
            </span>
            <Link
              href={profileHref}
              className="grid size-8 place-items-center rounded-full bg-primary-soft text-[0.6875rem] font-semibold text-primary"
              aria-label="Open your public profile"
            >
              {initials(user.profile.displayName)}
            </Link>
          </div>
        </header>

        {demo ? (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-warning/25 bg-warning/[0.07] px-4 py-2 text-xs text-warning lg:px-8">
            <span className="rounded-xs border border-warning/40 px-1 py-px text-[0.5625rem] font-semibold tracking-wide">
              DEMO
            </span>
            <span className="text-foreground/80">
              This account is showing representative data from the development adapter. It is not
              live GitHub activity.
            </span>
            <Link href="/integrations" className="underline underline-offset-2 hover:no-underline">
              Manage integration
            </Link>
          </div>
        ) : null}

        <main id="main" className="flex-1 px-4 pb-24 pt-6 sm:px-6 lg:px-8 lg:pb-12 lg:pt-8">
          <div className="mx-auto w-full max-w-[78rem]">{children}</div>
        </main>
      </div>

      <nav
        aria-label="Mobile"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        {/* Seven destinations even on a 360px screen: the fixed width of the
            viewport is what keeps a scroll bar from appearing. */}
        <ul className="grid grid-cols-7">
          {MOBILE.map((item) => {
            const Icon = item.icon;
            const href = item.href === "/profile" ? profileHref : item.href;
            const active = isActive(pathname, item.href === "/profile" ? "/u/" : item.href);
            return (
              <li key={item.href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-[3.5rem] flex-col items-center justify-center gap-1 px-0.5 text-[0.5625rem]",
                    active ? "text-primary" : "text-muted",
                  )}
                >
                  <Icon size={18} strokeWidth={1.75} />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
