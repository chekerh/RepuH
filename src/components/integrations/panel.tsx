"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowUpRight,
  GitBranch,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Unplug,
} from "lucide-react";
import { Badge, Button } from "@/components/ui";
import { formatDateTime, relativeTime } from "@/lib/utils";

export interface IntegrationView {
  provider: string;
  accountLogin: string | null;
  scopes: string[];
  status: "connected" | "error" | "revoked" | "pending" | "demo";
  lastSyncedAt: string | null;
  lastError: string | null;
  connectedAt: string | null;
}

export function IntegrationPanel({
  integration,
  demoMode,
  githubConfigured,
  importedEvents,
  evidenceCount,
  lastSyncAt,
}: {
  integration: IntegrationView | null;
  demoMode: boolean;
  githubConfigured: boolean;
  importedEvents: number;
  evidenceCount: number;
  lastSyncAt: string | null;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function call(action: "sync" | "disconnect" | "demo") {
    setPending(action);
    setError(null);
    setMessage(null);
    setNotice(null);
    try {
      const endpoint =
        action === "sync"
          ? "/api/integrations/github/sync"
          : action === "disconnect"
            ? "/api/integrations/github/disconnect"
            : "/api/integrations/github/demo";

      const response = await fetch(endpoint, { method: "POST" });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setError(payload?.error?.message ?? "The request did not complete.");
        return;
      }
      if (action === "demo") {
        setNotice(
          `Development adapter seeded ${payload?.imported ?? 0} labelled events. ${payload?.label ?? ""}`,
        );
      } else if (action === "sync") {
        setMessage(
          `Sync finished: ${payload?.imported ?? 0} imported, ${payload?.skipped ?? 0} unchanged or skipped.${payload?.error ? ` ${payload.error}` : ""}`,
        );
      } else {
        setNotice(payload?.note ?? "Integration disconnected.");
      }
      router.refresh();
    } catch {
      setError("Network error. The request was not applied.");
    } finally {
      setPending(null);
    }
  }

  const connected = Boolean(integration);
  const demo = integration?.status === "demo";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-y border-border py-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 grid size-9 place-items-center rounded-sm border border-border bg-surface">
            <GitBranch size={16} strokeWidth={1.75} />
          </span>
          <div>
            <p className="flex flex-wrap items-center gap-2 text-[0.9375rem] font-medium">
              GitHub
              {demo ? <Badge tone="warning">DEMO ADAPTER</Badge> : null}
              {connected && !demo ? <Badge tone="success">Connected</Badge> : null}
              {!connected ? <Badge>Not connected</Badge> : null}
              {integration?.status === "error" ? <Badge tone="danger">Error</Badge> : null}
            </p>
            <p className="mt-1 max-w-[58ch] text-[0.8125rem] leading-relaxed text-muted">
              {connected
                ? `Account ${integration?.accountLogin ?? "unknown"} · connected ${relativeTime(integration?.connectedAt)} · last sync ${relativeTime(integration?.lastSyncedAt)}`
                : "The primary production integration. Public repository metadata, pull requests you authored, reviews and issues."}
            </p>
            {integration?.scopes.length ? (
              <p className="mt-1.5 font-mono text-[0.6875rem] text-muted">
                scopes · {integration.scopes.join(" ")}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {connected ? (
            <>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => call("sync")}
                disabled={pending !== null || demo}
                title={demo ? "Demo data is not synchronized from GitHub" : undefined}
              >
                {pending === "sync" ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                Sync now
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => call("disconnect")}
                disabled={pending !== null}
              >
                {pending === "disconnect" ? <Loader2 size={13} className="animate-spin" /> : <Unplug size={13} />}
                Disconnect
              </Button>
            </>
          ) : (
            <Button
              type="button"
              size="sm"
              onClick={() => {
                if (githubConfigured) {
                  // Absolute form: this is an OAuth hand-off route, not an internal page.
                  window.location.assign(
                    new URL("/api/integrations/github/connect", window.location.origin).toString(),
                  );
                } else {
                  setError(
                    "GitHub OAuth is not configured in this environment. Add GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET to enable it.",
                  );
                }
              }}
              disabled={pending !== null}
            >
              <GitBranch size={13} />
              Connect GitHub
            </Button>
          )}
        </div>
      </div>

      {connected ? (
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Imported events", value: importedEvents },
            { label: "Evidence records", value: evidenceCount },
            { label: "Last sync", value: lastSyncAt ? formatDateTime(lastSyncAt) : "never" },
            { label: "Mode", value: demo ? "Development adapter" : "Live OAuth" },
          ].map((item) => (
            <div key={item.label}>
              <dt className="label">{item.label}</dt>
              <dd className="mt-1 text-[0.8125rem] font-medium">{item.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {integration?.lastError ? (
        <p className="flex items-start gap-2 rounded-sm border border-danger/30 bg-danger/5 px-3 py-2 text-xs text-danger">
          <AlertTriangle size={13} className="mt-0.5 shrink-0" />
          {integration.lastError}
        </p>
      ) : null}
      {message ? (
        <p className="rounded-sm border border-accent/30 bg-accent-soft px-3 py-2 text-xs text-accent">{message}</p>
      ) : null}
      {notice ? (
        <p className="rounded-sm border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">{notice}</p>
      ) : null}
      {error ? (
        <p role="alert" className="rounded-sm border border-danger/30 bg-danger/5 px-3 py-2 text-xs text-danger">
          {error}
        </p>
      ) : null}

      {demoMode ? (
        <div id="demo" className="border-y border-border py-5">
          <p className="flex flex-wrap items-center gap-2 text-[0.9375rem] font-medium">
            <ShieldCheck size={15} className="text-warning" />
            Development adapter
            <Badge tone="warning">REPRESENTATIVE DATA</Badge>
          </p>
          <p className="mt-2 max-w-[62ch] text-[0.8125rem] leading-relaxed text-muted">
            Seeds a labelled dataset so the product can be explored without external credentials. It
            never pretends to be a live GitHub connection: every resulting event carries{" "}
            <span className="font-mono text-[0.6875rem]">is_demo = true</span> and is rendered with a
            DEMO badge.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="secondary" onClick={() => call("demo")} disabled={pending !== null}>
              {pending === "demo" ? <Loader2 size={13} className="animate-spin" /> : null}
              {pending === "demo" ? "Seeding" : "Seed demo data into my account"}
            </Button>
            <a
              href="/docs#development-adapter"
              className="inline-flex h-8 items-center gap-1 rounded-sm px-2 text-xs text-muted hover:text-foreground"
            >
              How activation works <ArrowUpRight size={12} />
            </a>
          </div>
        </div>
      ) : (
        <p className="rounded-sm border border-border bg-surface-muted/50 px-3 py-2 text-xs text-muted">
          The development adapter is disabled because REPUH_DEMO_MODE is not enabled.
        </p>
      )}

      <div className="grid gap-4 text-[0.8125rem] leading-relaxed text-muted sm:grid-cols-2">
        <div>
          <p className="label mb-1.5">What is read</p>
          <p>
            Repository metadata (name, declared language, topics, visibility), pull requests authored
            by the connected account, reviews submitted, issues closed, releases and push events.
          </p>
        </div>
        <div>
          <p className="label mb-1.5">What is never read</p>
          <p>
            Full source code, private repositories without a separate authorisation, clipboard,
            keystrokes, unrelated browsing, banking or health data, private messages.
          </p>
        </div>
      </div>

      <p className="border-t border-border pt-4 text-[0.6875rem] leading-relaxed text-muted">
        Scheduled synchronization and webhooks are documented but not registered by this MVP: the
        sync endpoint is callable by an authenticated scheduler when{" "}
        <span className="font-mono">REPUH_CRON_SECRET</span> is configured. Nothing here claims a
        live webhook.
      </p>
    </div>
  );
}
