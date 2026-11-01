import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Contact",
  description: "How to reach the RepuH team, including security disclosure.",
};

export default function ContactPage() {
  return (
    <div className="grid gap-10 lg:grid-cols-[16rem_minmax(0,1fr)]">
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <p className="label">Contact</p>
        <p className="mt-2 text-[0.8125rem] leading-relaxed text-muted">
          There is no contact form in this MVP, because a form that silently drops a message would be
          dishonest. Use the channels below.
        </p>
      </aside>

      <article className="doc">
        <h1 className="display text-[clamp(2.4rem,5vw,3.4rem)]">Reach the project.</h1>

        <h2>Product and engineering</h2>
        <p>
          The implementation lives at{" "}
          <a href="https://github.com/chekerh/RepuH" target="_blank" rel="noreferrer noopener">
            github.com/chekerh/RepuH <ArrowUpRight size={12} className="inline" />
          </a>
          . Open an issue for a defect, a specification ambiguity or a disagreement about how a
          capability is modelled.
        </p>

        <h2>Incorrect attribution</h2>
        <p>
          Do not email a screenshot of a profile. Use the{" "}
          <Link href="/evidence">evidence explorer</Link> and report the specific record. The report
          is stored with its reason and the item is marked disputed and excluded from public
          projections while it is reviewed.
        </p>

        <h2>Security disclosure</h2>
        <p>
          If you believe you have found a vulnerability, please report it privately to the repository
          maintainers rather than opening a public issue. Include the affected route or module, a
          reproduction, and the impact you believe it has. Do not test against another person’s
          account.
        </p>
        <p>
          The threat model, assets and mitigations are documented in{" "}
          <Link href="/docs#security">the documentation</Link>.
        </p>

        <h2>Data requests</h2>
        <p>
          Export and deletion are self-service at{" "}
          <Link href="/settings#security">Settings → Security and data</Link>. If you cannot sign in,
          note that recovery mail delivery is not configured in this deployment — that limitation is
          documented rather than hidden behind a spinner.
        </p>
      </article>
    </div>
  );
}
