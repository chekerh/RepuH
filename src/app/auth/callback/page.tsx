import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Completing sign-in" };

/**
 * OAuth callbacks are handled server-side by /api/integrations/github/callback.
 * This route exists so the documented path is not a dead end when a provider
 * redirects here without a code.
 */
export default function AuthCallbackPage() {
  return (
    <main id="main" className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6">
      <h1 className="display text-4xl">Nothing to complete</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        Provider callbacks are verified server-side. If you arrived here after authorising GitHub,
        return to the integrations page and run a sync.
      </p>
      <div className="mt-6 flex gap-3 text-sm">
        <Link href="/integrations" className="font-medium text-primary hover:underline">
          Integrations
        </Link>
        <Link href="/dashboard" className="text-muted hover:text-foreground">
          Dashboard
        </Link>
      </div>
    </main>
  );
}
