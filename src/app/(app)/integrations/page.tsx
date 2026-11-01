import type { Metadata } from "next";
import { ArrowUpRight } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui";
import { IntegrationPanel } from "@/components/integrations/panel";
import { requireOnboarded } from "@/lib/auth/session";
import { activitySummary, countEvidence, getIntegration } from "@/lib/db/queries";
import { env } from "@/lib/env";

export const metadata: Metadata = { title: "Integrations" };
export const dynamic = "force-dynamic";

export default async function IntegrationsPage({
  searchParams,
}: {
  searchParams: Promise<{ github?: string; imported?: string; message?: string }>;
}) {
  const user = await requireOnboarded();
  const params = await searchParams;
  const integration = getIntegration(user.id, "github");
  const summary = activitySummary(user.id);
  const evidence = countEvidence(user.id);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Integrations"
        description="One backend, one consent model, one scoring system. The Chrome extension and the web app share this connection rather than maintaining a second source of truth."
        meta={
          <div className="flex flex-wrap items-center gap-3 border-t border-border pt-5 text-xs text-muted">
            <Badge tone={env.github.configured ? "success" : "warning"}>
              OAuth {env.github.configured ? "configured" : "not configured"}
            </Badge>
            <Badge tone={env.demoMode ? "warning" : "neutral"}>
              Development adapter {env.demoMode ? "enabled" : "disabled"}
            </Badge>
            <span>
              Callback <span className="font-mono">/api/integrations/github/callback</span>
            </span>
          </div>
        }
      />

      {params.github ? (
        <p className="rounded-sm border border-border bg-surface px-3 py-2 text-xs text-muted">
          Provider result: <span className="font-medium text-foreground">{params.github}</span>
          {params.imported ? ` · ${params.imported} events imported` : ""}
          {params.message ? ` · ${params.message}` : ""}
        </p>
      ) : null}

      <IntegrationPanel
        integration={
          integration
            ? {
                provider: integration.provider,
                accountLogin: integration.accountLogin,
                scopes: integration.scopes,
                status: integration.status,
                lastSyncedAt: integration.lastSyncedAt,
                lastError: integration.lastError,
                connectedAt: integration.connectedAt,
              }
            : null
        }
        demoMode={env.demoMode}
        githubConfigured={env.github.configured}
        importedEvents={summary.total}
        evidenceCount={evidence}
        lastSyncAt={integration?.lastSyncedAt ?? null}
      />

      <section className="border-t border-border pt-6">
        <h2 className="text-[0.9375rem] font-medium">Browser companion</h2>
        <p className="mt-1.5 max-w-[62ch] text-[0.8125rem] leading-relaxed text-muted">
          The Manifest V3 extension observes an explicit allowlist of professional documentation
          domains, queues events durably and pauses instantly when observation is revoked. It never
          captures keystrokes, clipboard contents, screenshots or full page content.
        </p>
        <div className="mt-3 flex flex-wrap gap-4 text-xs">
          <a
            href="/docs#extension"
            className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
          >
            Installation and pairing <ArrowUpRight size={12} />
          </a>
          <a
            href="/extension"
            className="inline-flex items-center gap-1 text-muted hover:text-foreground"
          >
            Open pairing page
          </a>
        </div>
      </section>

      <section className="border-t border-border pt-6">
        <h2 className="text-[0.9375rem] font-medium">Not implemented as live services</h2>
        <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-muted">
          Stated plainly rather than implied by a placeholder: email delivery, GitHub webhooks,
          scheduled cron execution, a hosted LLM classifier and mainnet blockchain anchoring are not
          active in this deployment. Each has a documented activation path and a safe fallback.
        </p>
      </section>
    </div>
  );
}
