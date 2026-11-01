import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { PublicFooter } from "@/components/chrome";

export default function NotFound() {
  return (
    <div className="min-h-dvh">
      <SiteHeader />
      <main id="main" className="mx-auto flex min-h-[60vh] w-full max-w-[46rem] flex-col justify-center px-4 py-20 sm:px-6">
        <p className="num text-xs text-muted">404</p>
        <h1 className="display mt-3 text-4xl">That address does not resolve.</h1>
        <p className="mt-3 max-w-[52ch] text-sm leading-relaxed text-muted">
          The page may have moved, the profile may be private, or the address may never have existed.
          Nothing is fabricated to fill the gap.
        </p>
        <div className="mt-6 flex gap-4 text-sm">
          <Link href="/" className="font-medium text-primary hover:underline">
            Return home
          </Link>
          <Link href="/explore" className="text-muted hover:text-foreground">
            Explore public profiles
          </Link>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
