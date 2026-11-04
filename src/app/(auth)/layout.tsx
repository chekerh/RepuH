import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Wordmark } from "@/components/brand";
import { PhosphorShader } from "@/shaders/phosphor-30/PhosphorShader";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_0.9fr]">
      <div className="flex min-h-dvh flex-col px-5 py-6 sm:px-8">
        <div className="flex items-center justify-between">
          <Wordmark />
          <Link
            href="/"
            className="text-xs text-muted transition-colors hover:text-foreground"
          >
            Back to site
          </Link>
        </div>

        <main id="main" className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-[25rem]">{children}</div>
        </main>

        <p className="text-[0.6875rem] leading-relaxed text-muted">
          RepuH never runs platform-administered tests. If an interface asks you to prove a skill in
          a browser, it is not this product.
        </p>
      </div>

      <aside className="relative hidden overflow-hidden border-l border-border bg-[#0b1220] lg:block">
        <div className="flex h-full flex-col justify-between p-10">
          <div className="flex items-center justify-between">
            <span className="label text-white/40">Evidence lattice</span>
            <span className="label text-white/25">ontology 1.0</span>
          </div>

          <div className="relative h-[24rem]">
            <PhosphorShader />
          </div>

          <div>
            <p className="display max-w-[24ch] text-3xl leading-[1.15] text-white/90">
              A number without its evidence is just a claim.
            </p>
            <p className="mt-4 max-w-[38ch] text-[0.8125rem] leading-relaxed text-white/45">
              Every estimate in RepuH carries its inputs, its confidence and its limitations. Where
              evidence is insufficient, the product says so.
            </p>
            <a
              href="https://github.com/chekerh/RepuH"
              target="_blank"
              rel="noreferrer noopener"
              className="mt-6 inline-flex items-center gap-1.5 text-xs text-white/50 hover:text-white"
            >
              Inspect the implementation
              <ArrowUpRight size={12} />
            </a>
          </div>
        </div>
      </aside>
    </div>
  );
}
