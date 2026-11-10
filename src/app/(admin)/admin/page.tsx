import type { Metadata } from "next";
import Link from "next/link";
import { AreaChart, BarList, Donut, Funnel, Heatmap, Sparkline } from "@/components/admin/charts";
import { Reveal } from "@/components/admin/reveal";
import { ConsoleHeader, Delta, Kpi, Panel, Rows, TableShell, Td, Th } from "@/components/admin/ui";
import { Badge } from "@/components/ui";
import { bytes, count, duration, percent } from "@/lib/admin/format";
import { processHealth } from "@/lib/admin/health";
import {
  adminCertificateFacts,
  adminDailySeries,
  adminDatabaseFacts,
  adminDeltas,
  adminEvidenceBreakdown,
  adminFunnel,
  adminHeatmap,
  adminIntegrations,
  adminOverview,
  adminProfileBreakdown,
  adminRecentEvidence,
  adminSecurityFacts,
  adminTopProfiles,
} from "@/lib/db/admin";
import { env } from "@/lib/env";
import { hederaStatus } from "@/lib/hedera/config";
import { relativeTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Overview" };

const TONES: Record<string, string> = {
  public: "var(--primary)",
  selective: "var(--accent)",
  private: "var(--muted)",
};

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export default async function AdminOverviewPage() {
  const overview = adminOverview();
  const deltas = adminDeltas();
  const series = adminDailySeries(14);
  const evidence = adminEvidenceBreakdown();
  const profiles = adminProfileBreakdown();
  const funnel = adminFunnel();
  const heatmap = adminHeatmap(14);
  const topProfiles = adminTopProfiles(6);
  const recentEvidence = adminRecentEvidence(8);
  const integrations = adminIntegrations();
  const certificates = adminCertificateFacts();
  const database = adminDatabaseFacts();
  const security = adminSecurityFacts();
  const health = processHealth();
  const hedera = hederaStatus();

  const users = overview.users;
  const content = overview.content;
  const labels = series.map((point) => point.date);
  const storage = (database.databaseBytes ?? 0) + (database.walBytes ?? 0);

  return (
    <div className="space-y-6">
      <ConsoleHeader
        eyebrow="Overview"
        title="Everything this instance is doing"
        description="Point-in-time counts from this deployment's database and process. No analytics script, third-party tag or external dashboard is involved, and every number below is computed from rows this app owns."
        actions={
          <>
            <Badge tone="warning">Read-only</Badge>
            <Badge tone={env.demoMode ? "warning" : "success"}>
              {env.demoMode ? "Demo data present" : "Production"}
            </Badge>
          </>
        }
        meta={
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.6875rem] text-muted">
            <span>
              <span className="num text-foreground">{count(users.total)}</span> accounts
            </span>
            <span>
              <span className="num text-foreground">{count(content.evidence)}</span> evidence rows
            </span>
            <span>
              <span className="num text-foreground">{count(content.certificates)}</span> certificates
            </span>
            <span>
              <span className="num text-foreground">{count(content.confirmedAnchors)}</span> confirmed
              anchors
            </span>
            <span className="ml-auto">
              Fresh at {new Date().toLocaleTimeString("en-GB", { hour12: false })}
            </span>
          </div>
        }
      />

      <Reveal>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          <Kpi
            label="Accounts"
            value={count(users.total)}
            hint={`${count(users.onboarded)} onboarded · ${count(users.demo)} demo`}
            visual={<Sparkline values={series.map((point) => point.accounts)} />}
            footnote={<Delta current={deltas.accounts.current} previous={deltas.accounts.previous} />}
          />
          <Kpi
            label="Evidence"
            value={count(content.evidence)}
            hint={`${count(content.demoEvidence)} demo · ${count(content.evidence - content.demoEvidence)} real`}
            visual={<Sparkline values={series.map((point) => point.evidence)} tone="var(--accent)" />}
            footnote={<Delta current={deltas.evidence.current} previous={deltas.evidence.previous} />}
          />
          <Kpi
            label="Public profiles"
            value={count(users.publicProfiles)}
            hint={`${count(users.selectableProfiles)} selective · ${count(profiles.visibility.find((row) => row.label === "private")?.value ?? 0)} private`}
            accent="var(--accent)"
          />
          <Kpi
            label="Certificates"
            value={count(content.certificates)}
            hint={
              content.revokedCertificates > 0
                ? `${count(content.revokedCertificates)} revoked`
                : "signed records"
            }
            footnote={
              <span className="text-[0.6875rem] text-muted">
                {certificates.anchorStatus.find((row) => row.label === "confirmed")?.value ?? 0} with a
                Hedera receipt
              </span>
            }
          />
          <Kpi
            label="Active sessions"
            value={count(overview.sessions.active)}
            hint={`${count(security.unverifiedUsers)} unverified emails`}
            footnote={
              <span className="text-[0.6875rem] text-muted">
                {count(overview.integrations.connected)} integrations connected
              </span>
            }
          />
          <Kpi
            label="Storage"
            value={bytes(storage)}
            hint={`${database.journalMode.toUpperCase()} · ${count(database.pageCount)} pages`}
            footnote={
              <span className="text-[0.6875rem] text-muted">
                {bytes(database.walBytes)} write-ahead log
              </span>
            }
          />
        </div>
      </Reveal>

      <div className="grid gap-4 xl:grid-cols-3">
        <Reveal className="xl:col-span-2">
          <Panel
            title="Growth — last 14 days"
            description="Accounts and evidence created per UTC day. Demo rows are included here and counted separately below, so a seeded database is never mistaken for organic growth."
          >
            <AreaChart
              series={[
                { label: "Accounts", values: series.map((point) => point.accounts), tone: "var(--primary)" },
                { label: "Evidence", values: series.map((point) => point.evidence), tone: "var(--accent)" },
              ]}
              labels={labels}
              valueLabel="records"
            />
          </Panel>
        </Reveal>

        <Reveal delay={0.05}>
          <Panel
            title="Onboarding funnel"
            description="Every stage is a stored row, not an estimate. The last step counts non-demo public profiles only."
          >
            <Funnel
              steps={funnel.map((step) => ({
                label: step.label,
                value: step.value,
                hint:
                  step.label === "Accounts"
                    ? `${percent(step.value, step.value)} of this database`
                    : undefined,
              }))}
            />
          </Panel>
        </Reveal>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Reveal>
          <Panel title="Evidence by signal" description="What kind of work the evidence describes.">
            <BarList items={evidence.signals} />
          </Panel>
        </Reveal>
        <Reveal delay={0.05}>
          <Panel title="Profile visibility" description="Onboarded profiles by who can read them.">
            <Donut
              segments={profiles.visibility.map((row) => ({
                label: titleCase(row.label),
                value: row.value,
                tone: TONES[row.label] ?? "var(--muted)",
              }))}
              centerValue={count(users.onboarded)}
              centerLabel="onboarded"
            />
          </Panel>
        </Reveal>
        <Reveal delay={0.1}>
          <Panel
            title="Connectivity"
            description="Provider state as recorded. A provider that is not configured is reported as missing, never simulated."
          >
            <div className="space-y-2">
              {integrations.length === 0 ? (
                <p className="py-4 text-[0.8125rem] text-muted">No integration rows exist yet.</p>
              ) : (
                integrations.slice(0, 5).map((row) => (
                  <div
                    key={`${row.provider}-${row.status}`}
                    className="flex items-center justify-between gap-2 rounded-xs border border-border px-2.5 py-2"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[0.8125rem]">{titleCase(row.provider)}</span>
                      <span className="block text-[0.6875rem] text-muted">
                        {row.lastSyncedAt ? `synced ${relativeTime(row.lastSyncedAt)}` : row.lastError ?? "never synced"}
                      </span>
                    </span>
                    <Badge
                      tone={
                        row.status === "connected"
                          ? "success"
                          : row.status === "error"
                            ? "danger"
                            : "warning"
                      }
                    >
                      {row.status}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </Panel>
        </Reveal>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Reveal className="xl:col-span-2">
          <Panel
            title="Activity rhythm"
            description="Activity events by day and two-hour bucket over the last 14 days. Local time is UTC; an empty bucket is a real zero."
          >
            <Heatmap cells={heatmap} label="Activity events per two-hour bucket" />
          </Panel>
        </Reveal>
        <Reveal delay={0.05}>
          <Panel
            title="Most evidence"
            description="Profiles ranked by attributable rows. This is a count, not a score or a ranking of people."
          >
            <ul className="divide-y divide-border">
              {topProfiles.length === 0 ? (
                <li className="py-4 text-[0.8125rem] text-muted">No profiles yet.</li>
              ) : (
                topProfiles.map((profile) => (
                  <li key={profile.username} className="flex items-center justify-between gap-3 py-2">
                    <span className="min-w-0">
                      <span className="flex items-center gap-1.5">
                        {profile.visibility === "public" ? (
                          <Link
                            href={`/u/${profile.username}`}
                            className="truncate text-[0.8125rem] hover:underline"
                          >
                            {profile.displayName}
                          </Link>
                        ) : (
                          <span className="truncate text-[0.8125rem]">{profile.displayName}</span>
                        )}
                        {profile.isDemo ? <Badge tone="warning">Demo</Badge> : null}
                      </span>
                      <span className="block truncate font-mono text-[0.625rem] text-muted">
                        @{profile.username} · {profile.visibility}
                      </span>
                    </span>
                    <span className="num shrink-0 text-[0.8125rem]">
                      {count(profile.evidenceCount)}
                    </span>
                  </li>
                ))
              )}
            </ul>
          </Panel>
        </Reveal>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Reveal className="xl:col-span-2">
          <Panel
            title="Newest evidence"
            description="The latest rows as stored. Demo rows are labelled so they cannot be read as live activity."
            flush
            actions={
              <Link href="/admin/evidence" className="text-[0.6875rem] text-primary hover:underline">
                Open evidence
              </Link>
            }
          >
            <div className="p-4">
              {recentEvidence.length === 0 ? (
                <p className="py-4 text-[0.8125rem] text-muted">No evidence has been recorded yet.</p>
              ) : (
                <TableShell minWidth="40rem">
                  <thead>
                    <tr>
                      <Th>Title</Th>
                      <Th>Owner</Th>
                      <Th>Signal</Th>
                      <Th>State</Th>
                      <Th className="text-right">When</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentEvidence.map((row) => (
                      <tr key={row.id}>
                        <Td className="max-w-[18rem]">
                          <span className="block truncate">{row.title}</span>
                          <span className="flex items-center gap-1 text-[0.625rem] text-muted">
                            {row.visibility} · {row.verificationState}
                            {row.isDemo ? <Badge tone="warning">Demo</Badge> : null}
                          </span>
                        </Td>
                        <Td className="font-mono text-[0.6875rem] text-muted">
                          {row.owner ? `@${row.owner}` : "—"}
                        </Td>
                        <Td className="text-[0.75rem]">{titleCase(row.signal)}</Td>
                        <Td>
                          <Badge tone={row.verificationState === "verified" ? "success" : "neutral"}>
                            {row.verificationState}
                          </Badge>
                        </Td>
                        <Td className="whitespace-nowrap text-right text-[0.6875rem] text-muted">
                          {relativeTime(row.createdAt)}
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </TableShell>
              )}
            </div>
          </Panel>
        </Reveal>

        <Reveal delay={0.05}>
          <Panel
            title="Platform state"
            description="Configuration gaps are shown where the capability is claimed."
          >
            <Rows
              items={[
                {
                  label: "Hedera anchoring",
                  value: hedera.configured ? (
                    <Badge tone="success">Configured</Badge>
                  ) : (
                    <Badge tone="warning">Unavailable</Badge>
                  ),
                  note: hedera.configured ? hedera.network : hedera.missing.join(", "),
                },
                {
                  label: "GitHub OAuth",
                  value: env.github.configured ? (
                    <Badge tone="success">Configured</Badge>
                  ) : (
                    <Badge tone="warning">Unavailable</Badge>
                  ),
                },
                {
                  label: "Certificate key",
                  value: (
                    <Badge tone={security.certificateKeySource === "environment" ? "success" : "warning"}>
                      {security.certificateKeySource}
                    </Badge>
                  ),
                },
                {
                  label: "Database integrity",
                  value: (
                    <Badge tone={database.quickCheck === "ok" ? "success" : "danger"}>
                      {database.quickCheck}
                    </Badge>
                  ),
                  note: `${database.journalMode} journal · ${database.pageSize} B pages`,
                },
                {
                  label: "Process",
                  value: `up ${duration(health.uptimeSeconds)}`,
                  note: `Node ${health.node} · ${health.platform}/${health.arch}`,
                },
                {
                  label: "API tokens",
                  value: count(security.apiTokens),
                  note: "Extension and scheduler credentials.",
                },
              ]}
            />
          </Panel>
        </Reveal>
      </div>
    </div>
  );
}
