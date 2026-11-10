"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { Wordmark } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { ButtonLink } from "@/components/ui";

const LINKS = [
  { href: "/#how", label: "How it works" },
  { href: "/#principles", label: "Principles" },
  { href: "/explore", label: "Explore" },
  { href: "/leaderboards", label: "Leaderboards" },
  { href: "/docs", label: "Documentation" },
];

const EASE = [0.16, 1, 0.3, 1] as const;

export function SiteHeader({ signedIn = false }: { signedIn?: boolean }) {
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();

  // Escape closes the panel; focus returns to the toggle naturally because the
  // toggle stays mounted.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/92 backdrop-blur-[2px]">
      {/* The nav joins at lg, not md: with five links plus the theme control,
          the sign-in link and the primary action, a 768px header overflowed by
          56px. Below lg the panel carries the same links. */}
      <div className="mx-auto flex h-16 w-full max-w-[80rem] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Wordmark />

        <nav aria-label="Main" className="hidden items-center gap-7 lg:flex">
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

        <div className="flex shrink-0 items-center gap-2">
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
                className="hidden px-2 text-[0.8125rem] text-muted transition-colors hover:text-foreground lg:block"
              >
                Sign in
              </Link>
              <div className="hidden sm:block">
                <ButtonLink href="/register" size="sm">
                  Create your identity
                </ButtonLink>
              </div>
            </>
          )}
          <button
            type="button"
            className="grid size-9 place-items-center rounded-sm text-foreground transition-colors hover:bg-surface-muted lg:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="site-menu"
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            key="site-menu"
            id="site-menu"
            initial={reduce ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="overflow-hidden border-t border-border bg-background lg:hidden"
          >
            <nav aria-label="Mobile" className="mx-auto grid w-full max-w-[80rem] gap-1 px-4 py-3">
              {LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="rounded-sm px-2 py-2.5 text-sm text-muted transition-colors hover:bg-surface-muted hover:text-foreground"
                >
                  {link.label}
                </Link>
              ))}
              <div className="mt-1 grid gap-2 border-t border-border pt-3">
                {signedIn ? (
                  <ButtonLink href="/dashboard" size="md" onClick={() => setOpen(false)}>
                    Open dashboard
                  </ButtonLink>
                ) : (
                  <>
                    <ButtonLink href="/register" size="md" onClick={() => setOpen(false)}>
                      Create your identity
                    </ButtonLink>
                    <Link
                      href="/login"
                      onClick={() => setOpen(false)}
                      className="rounded-sm px-2 py-2.5 text-sm text-muted transition-colors hover:bg-surface-muted hover:text-foreground"
                    >
                      Sign in
                    </Link>
                  </>
                )}
                <div className="px-2 py-2">
                  <ThemeToggle />
                </div>
              </div>
            </nav>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
