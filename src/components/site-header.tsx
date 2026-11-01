"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Wordmark } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { ButtonLink } from "@/components/ui";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/#how", label: "How it works" },
  { href: "/#principles", label: "Principles" },
  { href: "/explore", label: "Network" },
  { href: "/leaderboards", label: "Rankings" },
  { href: "/docs", label: "Documentation" },
];

export function SiteHeader({ signedIn = false }: { signedIn?: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/92 backdrop-blur-[2px]">
      <div className="mx-auto flex h-16 w-full max-w-[80rem] items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
        <Wordmark />

        <nav aria-label="Main" className="hidden items-center gap-7 md:flex">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-[0.8125rem] text-muted transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <div className="hidden sm:block">
            <ThemeToggle />
          </div>
          {signedIn ? (
            <ButtonLink href="/dashboard" size="sm">
              Open dashboard
            </ButtonLink>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden px-2 text-[0.8125rem] text-muted transition-colors hover:text-foreground sm:block"
              >
                Sign in
              </Link>
              <ButtonLink href="/register" size="sm">
                Create your identity
              </ButtonLink>
            </>
          )}
          <button
            type="button"
            className="grid size-9 place-items-center rounded-sm text-foreground md:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      <div
        className={cn(
          "border-t border-border bg-background md:hidden",
          open ? "block" : "hidden",
        )}
      >
        <nav aria-label="Mobile" className="mx-auto grid w-full max-w-[80rem] gap-1 px-4 py-3">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="rounded-sm px-2 py-2.5 text-sm text-muted hover:bg-surface-muted hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/login"
            onClick={() => setOpen(false)}
            className="rounded-sm px-2 py-2.5 text-sm text-muted hover:bg-surface-muted hover:text-foreground"
          >
            Sign in
          </Link>
          <div className="px-2 py-2">
            <ThemeToggle />
          </div>
        </nav>
      </div>
    </header>
  );
}
