import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { SiteHeader } from "@/components/site-header";
import { currentUser } from "@/lib/auth/session";
import { getIntegration } from "@/lib/db/queries";

export async function Chrome({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (user?.profile.onboardingComplete) {
    const integration = getIntegration(user.id, "github");
    return (
      <AppShell user={user} demo={integration?.status === "demo"}>
        {children}
      </AppShell>
    );
  }

  return (
    <div className="min-h-dvh">
      <SiteHeader signedIn={Boolean(user)} />
      <main id="main" className="mx-auto w-full max-w-[80rem] px-4 pb-16 pt-8 sm:px-6 lg:px-8">
        {children}
      </main>
      <PublicFooter />
    </div>
  );
}

export function PublicFooter() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto flex w-full max-w-[80rem] flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <p className="text-xs text-muted">
          RepuH · evidence-backed professional identity · MVP
        </p>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted">
          <Link href="/about" className="hover:text-foreground">About</Link>
          <Link href="/privacy" className="hover:text-foreground">Privacy</Link>
          <Link href="/terms" className="hover:text-foreground">Terms</Link>
          <Link href="/docs" className="hover:text-foreground">Documentation</Link>
          <Link href="/contact" className="hover:text-foreground">Contact</Link>
          <a
            href="https://github.com/chekerh/RepuH"
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1 hover:text-foreground"
          >
            GitHub <ArrowUpRight size={11} />
          </a>
        </nav>
      </div>
    </footer>
  );
}
