"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Activity,
  ArrowUpRight,
  BadgeCheck,
  ChevronsLeft,
  ChevronsRight,
  Database,
  FileCheck2,
  HeartPulse,
  LayoutDashboard,
  Menu,
  RefreshCw,
  Search,
  ShieldCheck,
  Users,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition, type ReactNode } from "react";
import { CommandPalette, type PaletteItem } from "@/components/admin/command-palette";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  hint: string;
  icon: LucideIcon;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV: NavGroup[] = [
  {
    label: "Observe",
    items: [
      { href: "/admin", label: "Overview", hint: "KPIs, growth and data quality", icon: LayoutDashboard },
      { href: "/admin/activity", label: "Activity", hint: "Recent writes and audit trail", icon: Activity },
    ],
  },
  {
    label: "People and proof",
    items: [
      { href: "/admin/users", label: "Users", hint: "Accounts, profiles and verification", icon: Users },
      { href: "/admin/evidence", label: "Evidence", hint: "Ingestion mix by skill and source", icon: FileCheck2 },
      { href: "/admin/certificates", label: "Certificates", hint: "Signing, revocation and anchoring", icon: BadgeCheck },
    ],
  },
  {
    label: "Platform",
    items: [
      { href: "/admin/security", label: "Security", hint: "Controls, sessions and limits", icon: ShieldCheck },
      { href: "/admin/database", label: "Database", hint: "Tables, storage and integrity", icon: Database },
      { href: "/admin/monitoring", label: "Monitoring", hint: "Process health and configuration", icon: HeartPulse },
      { href: "/admin/finops", label: "FinOps", hint: "Billable units, no invented rates", icon: Wallet },
      { href: "/admin/seo", label: "SEO", hint: "Public routes, sitemap and exclusions", icon: Search },
    ],
  },
];

const PALETTE_ITEMS: PaletteItem[] = NAV.flatMap((group) =>
  group.items.map((item) => ({
    href: item.href,
    label: item.label,
    group: group.label,
    hint: item.hint,
  })),
);

const RAIL_COOKIE = "repuh_admin_rail";

function isActive(pathname: string, href: string): boolean {
  return href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminShell({
  email,
  demoMode,
  defaultCollapsed,
  children,
}: {
  email: string;
  demoMode: boolean;
  defaultCollapsed: boolean;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const reduced = useReducedMotion();
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [refreshing, startRefresh] = useTransition();

  const current = useMemo(
    () => PALETTE_ITEMS.find((item) => isActive(pathname, item.href)),
    [pathname],
  );

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((open) => !open);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [mobileOpen]);

  function toggleRail() {
    const next = !collapsed;
    setCollapsed(next);
    // A cookie keeps the preference on the server too, so the first paint after
    // a reload already has the right rail width and there is no layout shift.
    document.cookie = `${RAIL_COOKIE}=${next ? "1" : "0"}; path=/; max-age=31536000; samesite=lax`;
  }

  const sidebar = (rail: boolean, onNavigate?: () => void) => (
    <div className="flex h-full min-h-0 flex-col bg-console text-console-foreground">
      <div className={cn("flex h-16 items-center gap-3 border-b border-console-line", rail ? "justify-center px-2" : "px-4")}>
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-sm bg-console-accent font-display text-lg leading-none text-console">
          R
        </span>
        {rail ? null : (
          <div className="min-w-0 flex-1">
            <p className="truncate text-[0.9375rem] font-medium tracking-tight">RepuH</p>
            <p className="truncate text-[0.6875rem] uppercase tracking-[0.14em] text-console-muted">
              Developer console
            </p>
          </div>
        )}
        <button
          type="button"
          onClick={toggleRail}
          aria-label={rail ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(
            "hidden h-8 w-8 place-items-center rounded-xs text-console-muted transition-colors hover:bg-console-raised hover:text-console-foreground lg:grid",
            rail && "absolute left-[3.4rem] top-4 border border-console-line bg-console",
          )}
        >
          {rail ? <ChevronsRight size={15} /> : <ChevronsLeft size={15} />}
        </button>
      </div>

      <div className={cn("border-b border-console-line py-3", rail ? "px-2" : "px-4")}>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-xs border border-console-line text-[0.6875rem] font-medium",
            rail ? "h-7 w-full justify-center px-0" : "px-2 py-1",
          )}
        >
          <span
            aria-hidden
            className={cn("h-1.5 w-1.5 rounded-full", demoMode ? "bg-warning" : "bg-accent")}
          />
          {rail ? (demoMode ? "D" : "P") : demoMode ? "Demo data" : "Production"}
        </span>
        {rail ? null : (
          <p className="mt-2 text-[0.6875rem] leading-relaxed text-console-muted">
            Read-only. No control here deletes data, re-seeds the database or rewrites an anchor.
          </p>
        )}
      </div>

      <nav aria-label="Admin sections" className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
        {NAV.map((group) => (
          <div key={group.label} className="mb-4 last:mb-0">
            {rail ? (
              <div className="mx-2 mb-2 border-t border-console-line" aria-hidden />
            ) : (
              <p className="px-2 pb-1.5 text-[0.625rem] font-medium uppercase tracking-[0.14em] text-console-muted/80">
                {group.label}
              </p>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(pathname, item.href);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      title={rail ? item.label : undefined}
                      className={cn(
                        "group relative flex items-center rounded-xs text-[0.8125rem] transition-colors",
                        rail ? "h-10 justify-center" : "gap-2.5 px-2.5 py-2",
                        active
                          ? "bg-console-raised text-console-foreground"
                          : "text-console-muted hover:bg-console-raised/60 hover:text-console-foreground",
                      )}
                    >
                      {active ? (
                        <span aria-hidden className="absolute left-0 h-5 w-0.5 rounded-full bg-console-accent" />
                      ) : null}
                      <Icon size={16} strokeWidth={1.7} aria-hidden className="shrink-0" />
                      {rail ? (
                        <span className="sr-only">{item.label}</span>
                      ) : (
                        <span className="truncate">{item.label}</span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className={cn("border-t border-console-line py-3", rail ? "px-2" : "px-4")}>
        {rail ? (
          <Link
            href="/dashboard"
            title="Back to the app"
            className="grid h-9 w-full place-items-center rounded-xs text-console-muted hover:bg-console-raised hover:text-console-foreground"
          >
            <ArrowUpRight size={15} aria-hidden />
            <span className="sr-only">Back to the app</span>
          </Link>
        ) : (
          <>
            <p className="truncate text-[0.75rem] text-console-foreground" title={email}>
              {email}
            </p>
            <Link
              href="/dashboard"
              className="mt-1.5 inline-flex items-center gap-1 text-[0.75rem] text-console-muted hover:text-console-foreground"
            >
              Back to the app <ArrowUpRight size={12} aria-hidden />
            </Link>
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh bg-background">
      <a
        href="#admin-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-100 focus:rounded-sm focus:bg-surface focus:px-3 focus:py-2 focus:text-sm"
      >
        Skip to console content
      </a>

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden transition-[width] duration-200 ease-out lg:block",
          collapsed ? "w-[4.5rem]" : "w-64",
        )}
      >
        {sidebar(collapsed)}
      </aside>

      <AnimatePresence>
        {mobileOpen ? (
          <div className="fixed inset-0 z-60 lg:hidden">
            <motion.button
              type="button"
              aria-label="Close navigation"
              onClick={() => setMobileOpen(false)}
              className="absolute inset-0 bg-[color-mix(in_srgb,var(--console)_60%,transparent)]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduced ? 0 : 0.18 }}
            />
            <motion.aside
              className="absolute inset-y-0 left-0 w-[17rem] shadow-2xl"
              initial={{ x: reduced ? 0 : "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: reduced ? 0 : "-100%" }}
              transition={{ duration: reduced ? 0 : 0.24, ease: [0.16, 1, 0.3, 1] }}
            >
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Close navigation"
                className="absolute right-3 top-3 z-10 grid h-8 w-8 place-items-center rounded-xs text-console-muted hover:bg-console-raised hover:text-console-foreground"
              >
                <X size={16} />
              </button>
              {sidebar(false, () => setMobileOpen(false))}
            </motion.aside>
          </div>
        ) : null}
      </AnimatePresence>

      <div
        className={cn(
          "transition-[padding] duration-200 ease-out",
          collapsed ? "lg:pl-[4.5rem]" : "lg:pl-64",
        )}
      >
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xs border border-border text-muted hover:bg-surface-muted hover:text-foreground lg:hidden"
          >
            <Menu size={17} />
          </button>

          <p className="min-w-0 truncate text-[0.8125rem]">
            <span className="text-muted">Console</span>
            <span aria-hidden className="px-1.5 text-border-strong">
              /
            </span>
            <span className="font-medium">{current?.label ?? "Overview"}</span>
          </p>

          <div className="ml-auto flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="hidden h-8 items-center gap-2 rounded-sm border border-border px-2.5 text-[0.75rem] text-muted transition-colors hover:border-border-strong hover:text-foreground sm:flex"
            >
              <Search size={13} aria-hidden />
              <span>Search</span>
              <kbd className="rounded-xs border border-border px-1 text-[0.625rem]">⌘K</kbd>
            </button>
            <button
              type="button"
              onClick={() => startRefresh(() => router.refresh())}
              aria-label="Refresh console data"
              className="grid h-8 w-8 place-items-center rounded-sm border border-border text-muted transition-colors hover:border-border-strong hover:text-foreground"
            >
              <RefreshCw size={14} className={refreshing ? "animate-spin" : undefined} />
            </button>
            <Link
              href="/dashboard"
              className="hidden h-8 items-center gap-1 rounded-sm px-2 text-[0.75rem] text-muted transition-colors hover:text-foreground sm:flex"
            >
              Open app <ArrowUpRight size={12} aria-hidden />
            </Link>
          </div>
        </header>

        <main id="admin-main" className="mx-auto w-full max-w-[92rem] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} items={PALETTE_ITEMS} />
    </div>
  );
}
