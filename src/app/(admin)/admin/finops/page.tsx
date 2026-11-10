import type { Metadata } from "next";
import { ProgressRow } from "@/components/admin/charts";
import { Reveal } from "@/components/admin/reveal";
import { ConsoleHeader, Kpi, Panel, Rows, TableShell, Td, Th } from "@/components/admin/ui";
import { Badge } from "@/components/ui";
import { bytes, count, percent } from "@/lib/admin/format";
import { adminFinopsFacts, adminOverview } from "@/lib/db/admin";
import { hederaStatus } from "@/lib/hedera/config";

export const metadata: Metadata = { title: "FinOps" };

export default async function AdminFinopsPage() {
  const facts = adminFinopsFacts();
  const overview = adminOverview();
  const hedera = hederaStatus();
  const storage = (facts.databaseBytes ?? 0) + (facts.walBytes ?? 0);
  const demoShare = percent(overview.content.demoEvidence, overview.content.evidence);

  const units: Array<[string, string, string, string]> = [
    ["Application database", bytes(facts.databaseBytes), "SQLite main file", "not configured"],
    ["Write-ahead log", bytes(facts.walBytes), "SQLite WAL", "not configured"],
    ["Evidence records", count(facts.evidence), "evidence table", "not configured"],
    ["Activity events", count(facts.events), "activity_events table", "not configured"],
    [
      "HCS consensus messages",
      count(facts.confirmedAnchors),
      "confirmed anchors only",
      "not configured",
    ],
    [
      "Signed certificates (active)",
      count(facts.activeCertificates),
      "certificates.status = active",
      "not configured",
    ],
    [
      "Revoked certificates",
      count(facts.revokedCertificates),
      "certificates.status = revoked",
      "not configured",
    ],
    ["Active sessions", count(facts.activeSessions), "sessions table", "not configured"],
    ["API tokens", count(facts.apiTokens), "api_tokens table", "not configured"],
  ];

  return (
    <div className="space-y-6">
      <ConsoleHeader
        eyebrow="Platform"
        title="FinOps"
        description="Billable units this deployment produces, without a currency estimate. No cloud billing account, price sheet or HCS fee table is configured here, so a monthly total would be a fabricated number."
        actions={<Badge tone="warning">No billing configured</Badge>}
        meta={
          <div className="flex flex-wrap items-center gap-2 text-[0.6875rem] text-muted">
            <Badge tone="neutral">{bytes(storage)} on disk</Badge>
            <Badge tone="neutral">{count(facts.evidence)} evidence rows</Badge>
            <Badge tone="warning">{demoShare} demo evidence</Badge>
            <span className="ml-auto">rates intentionally blank</span>
          </div>
        }
      />

      <Reveal>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          <Kpi label="Database" value={bytes(facts.databaseBytes)} hint="main SQLite file" />
          <Kpi
            label="WAL"
            value={bytes(facts.walBytes)}
            hint="write-ahead log"
            accent="var(--accent)"
          />
          <Kpi label="Evidence" value={count(facts.evidence)} hint="rows stored" />
          <Kpi label="HCS messages" value={count(facts.confirmedAnchors)} hint="confirmed only" />
          <Kpi
            label="Certificates"
            value={count(facts.certificates)}
            hint={`${count(facts.activeCertificates)} active`}
          />
          <Kpi
            label="Active sessions"
            value={count(facts.activeSessions)}
            hint="request-scoped rows"
            accent="var(--muted)"
          />
        </div>
      </Reveal>

      <div className="grid gap-4 xl:grid-cols-3">
        <Reveal className="xl:col-span-2">
          <Panel
            title="Billable units"
            description="The quantities a cost model would multiply by a provider rate. The rate column is deliberately empty."
            flush
          >
            <div className="p-4">
              <TableShell minWidth="46rem">
                <thead>
                  <tr>
                    <Th>Unit</Th>
                    <Th className="text-right">Quantity</Th>
                    <Th>Source</Th>
                    <Th>Rate</Th>
                  </tr>
                </thead>
                <tbody>
                  {units.map(([unit, quantity, source, rate]) => (
                    <tr key={unit}>
                      <Td className="text-[0.75rem]">{unit}</Td>
                      <Td className="num text-right text-[0.75rem]">{quantity}</Td>
                      <Td className="font-mono text-[0.625rem] text-muted">{source}</Td>
                      <Td>
                        <Badge tone="neutral">{rate}</Badge>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </TableShell>
            </div>
          </Panel>
        </Reveal>

        <Reveal delay={0.05}>
          <Panel title="Storage split" description="Where the bytes actually are.">
            <div className="space-y-4">
              <ProgressRow
                label="Main file"
                value={facts.databaseBytes ?? 0}
                total={Math.max(storage, 1)}
                tone="var(--primary)"
                suffix={bytes(facts.databaseBytes)}
              />
              <ProgressRow
                label="Write-ahead log"
                value={facts.walBytes ?? 0}
                total={Math.max(storage, 1)}
                tone="var(--accent)"
                suffix={bytes(facts.walBytes)}
              />
              <p className="text-[0.6875rem] leading-relaxed text-muted">
                Storage grows with evidence rows and their activity events. The WAL shrinks on
                checkpoint; neither figure includes backups, which this instance does not take.
              </p>
            </div>
          </Panel>
        </Reveal>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Reveal>
          <Panel title="Provider state" description="Where cost would come from, and whether it can be read.">
            <Rows
              items={[
                {
                  label: "Hedera network",
                  value: hedera.configured ? `${hedera.network} · configured` : "Not configured",
                  note: `${count(facts.anchors)} anchor rows, ${count(facts.confirmedAnchors)} with a receipt. Local anchors cost nothing.`,
                },
                {
                  label: "Object storage / CDN",
                  value: <Badge tone="neutral">Not used</Badge>,
                  note: "The MVP stores no user uploads.",
                },
                {
                  label: "Email delivery",
                  value: <Badge tone="neutral">Not used</Badge>,
                  note: "No provider is configured, so there is no email spend to measure.",
                },
                {
                  label: "Compute",
                  value: <Badge tone="neutral">Local process</Badge>,
                  note: `Node ${process.version}; no container or serverless billing metadata is available.`,
                },
              ]}
            />
          </Panel>
        </Reveal>

        <Reveal delay={0.05}>
          <Panel title="Cost model gaps" description="What would be needed before a number could be trusted.">
            <ul className="space-y-2.5 text-[0.75rem] leading-relaxed text-muted">
              <li>No provider account, invoice or contract is connected to this deployment.</li>
              <li>HCS pricing depends on message size and network; neither is known here.</li>
              <li>
                {count(overview.content.demoEvidence)} of {count(overview.content.evidence)} evidence
                rows are demo data and should be excluded from a production projection.
              </li>
              <li>Currency would be a guess, so the console reports units only.</li>
            </ul>
          </Panel>
        </Reveal>
      </div>
    </div>
  );
}
