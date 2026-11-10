import type { Metadata } from "next";
import { ProgressRow } from "@/components/admin/charts";
import { Reveal } from "@/components/admin/reveal";
import { ConsoleHeader, Kpi, Panel, Rows, TableShell, Td, Th } from "@/components/admin/ui";
import { Badge } from "@/components/ui";
import { count, percent } from "@/lib/admin/format";
import { adminCertificateFacts, adminAuditLog, adminSecurityFacts } from "@/lib/db/admin";
import { env } from "@/lib/env";
import { hederaStatus } from "@/lib/hedera/config";
import { relativeTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Security" };

export default async function AdminSecurityPage() {
  const facts = adminSecurityFacts();
  const certificates = adminCertificateFacts();
  const hedera = hederaStatus();
  const audit = adminAuditLog(24);
  const sessions = facts.activeSessions + facts.expiredSessions;
  const revoked = certificates.status.find((row) => row.label === "revoked")?.value ?? 0;

  return (
    <div className="space-y-6">
      <ConsoleHeader
        eyebrow="Platform"
        title="Security posture"
        description="Configuration state and recent security-relevant writes. A control that is not configured is listed as missing rather than implied, and the audit table is read in place — nothing is shipped to a third party."
        actions={
          <Badge tone={env.appSecretIsFallback ? "danger" : "success"}>
            {env.appSecretIsFallback ? "Development secret" : "Secret set"}
          </Badge>
        }
        meta={
          <div className="flex flex-wrap items-center gap-2 text-[0.6875rem] text-muted">
            <Badge tone="warning">{count(facts.unverifiedUsers)} unverified</Badge>
            <Badge tone="neutral">{count(facts.activeSessions)} active sessions</Badge>
            <Badge tone="neutral">{count(facts.apiTokens)} API tokens</Badge>
            {revoked > 0 ? <Badge tone="danger">{count(revoked)} revoked certificates</Badge> : null}
          </div>
        }
      />

      <Reveal>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          <Kpi
            label="Unverified emails"
            value={count(facts.unverifiedUsers)}
            hint="no delivery provider configured"
            accent="var(--warning)"
          />
          <Kpi label="Active sessions" value={count(facts.activeSessions)} hint="not yet expired" />
          <Kpi
            label="Expired sessions"
            value={count(facts.expiredSessions)}
            hint="awaiting purge"
            accent="var(--muted)"
          />
          <Kpi label="Audit events" value={count(facts.auditEvents24h)} hint="last 24 hours" />
          <Kpi label="API tokens" value={count(facts.apiTokens)} hint="extension and scheduler" />
          <Kpi
            label="Certificate key"
            value={facts.certificateKeySource === "environment" ? "Env" : "DB"}
            hint={facts.certificateKeySource}
            accent={
              facts.certificateKeySource === "environment" ? "var(--success)" : "var(--warning)"
            }
          />
        </div>
      </Reveal>

      <div className="grid gap-4 xl:grid-cols-3">
        <Reveal className="xl:col-span-2">
          <Panel
            title="Controls"
            description="Each row states what is actually enforced on this deployment."
          >
            <Rows
              items={[
                {
                  label: "Application secret",
                  value: env.appSecretIsFallback ? (
                    <Badge tone="danger">Development fallback</Badge>
                  ) : (
                    <Badge tone="success">Set</Badge>
                  ),
                  note: "Signs sessions and encrypts provider tokens at rest.",
                },
                {
                  label: "Email delivery",
                  value: <Badge tone="warning">Not configured</Badge>,
                  note: "No address-ownership proof and no recovery email; accounts are marked verified on first sign-in.",
                },
                {
                  label: "Rate limiting",
                  value: <Badge tone="warning">In-process</Badge>,
                  note: "Per-instance fixed window. A multi-instance deployment needs a shared store.",
                },
                {
                  label: "Database isolation",
                  value: <Badge tone="warning">Application-level</Badge>,
                  note: "SQLite with user_id predicates; no Postgres RLS. File permissions are the boundary.",
                },
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
                  note: "Public-repository sync only when credentials exist.",
                },
                {
                  label: "Development adapter",
                  value: env.demoMode ? (
                    <Badge tone="warning">Enabled</Badge>
                  ) : (
                    <Badge tone="success">Disabled</Badge>
                  ),
                  note: "Demo rows are marked is_demo = 1 and labelled in every surface.",
                },
              ]}
            />
          </Panel>
        </Reveal>

        <Reveal delay={0.05}>
          <Panel title="Session split" description="Rows are counted by absolute expiry.">
            <div className="space-y-4">
              <ProgressRow
                label="Active"
                value={facts.activeSessions}
                total={Math.max(sessions, 1)}
                tone="var(--success)"
              />
              <ProgressRow
                label="Expired"
                value={facts.expiredSessions}
                total={Math.max(sessions, 1)}
                tone="var(--muted)"
              />
              <p className="text-[0.6875rem] leading-relaxed text-muted">
                {percent(facts.activeSessions, Math.max(sessions, 1))} of stored sessions have not
                expired. Expired rows are kept until a cleanup pass removes them.
              </p>
            </div>
          </Panel>
        </Reveal>
      </div>

      <Reveal>
        <Panel
          title="Recent audit events"
          description="Newest 24 rows. Metadata is intentionally not rendered; the database page holds storage facts."
          flush
        >
          <div className="p-4">
            {audit.length === 0 ? (
              <p className="py-6 text-center text-[0.8125rem] text-muted">
                No audit events have been recorded yet.
              </p>
            ) : (
              <TableShell minWidth="44rem">
                <thead>
                  <tr>
                    <Th>When</Th>
                    <Th>Action</Th>
                    <Th>Actor</Th>
                    <Th>Target</Th>
                  </tr>
                </thead>
                <tbody>
                  {audit.map((row) => (
                    <tr key={row.id}>
                      <Td className="whitespace-nowrap text-[0.6875rem] text-muted">
                        {relativeTime(row.createdAt)}
                      </Td>
                      <Td className="font-mono text-[0.6875rem]">{row.action}</Td>
                      <Td className="text-[0.6875rem] text-muted">
                        {row.actor ?? "system / deleted account"}
                      </Td>
                      <Td className="font-mono text-[0.6875rem] text-muted">{row.target ?? "—"}</Td>
                    </tr>
                  ))}
                </tbody>
              </TableShell>
            )}
          </div>
        </Panel>
      </Reveal>
    </div>
  );
}
