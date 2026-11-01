import type { Metadata } from "next";
import { ArrowUpRight } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ExtensionPairing } from "@/components/extension/pairing";
import { requireOnboarded } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Browser companion" };
export const dynamic = "force-dynamic";

export default async function ExtensionPage() {
  await requireOnboarded();

  return (
    <div className="max-w-[62rem] space-y-8">
      <PageHeader
        title="Browser companion"
        description="The Manifest V3 extension is a complementary observer, not a second product. It shares this backend, consent model and scoring engine."
        meta={
          <div className="flex flex-wrap gap-4 border-t border-border pt-5 text-xs">
            <a
              href="/docs#extension"
              className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
            >
              Installation steps <ArrowUpRight size={12} />
            </a>
            <span className="text-muted">
              Build output: <span className="font-mono">apps/extension/dist</span>
            </span>
          </div>
        }
      />

      <ExtensionPairing />

      <section className="border-t border-border pt-6">
        <h2 className="text-[0.9375rem] font-medium">Honest status</h2>
        <p className="mt-1.5 max-w-[68ch] text-[0.8125rem] leading-relaxed text-muted">
          This extension is loadable unpacked from a local build. It is not published to the Chrome
          Web Store, it has no store listing, and it does not claim one. Service-worker recovery,
          durable queueing and pause-on-revoke are implemented; remote update delivery is not.
        </p>
      </section>
    </div>
  );
}
