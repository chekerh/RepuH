import type { Metadata } from "next";
import { BarList, Donut } from "@/components/admin/charts";
import { Reveal } from "@/components/admin/reveal";
import { ConsoleHeader, Kpi, Panel, Rows, TableShell, Td, Th } from "@/components/admin/ui";
import { Badge } from "@/components/ui";
import { count, percent } from "@/lib/admin/format";
import {
  adminCertificateFacts,
  adminCertificates,
  adminSecurityFacts,
} from "@/lib/db/admin";
import { hederaStatus } from "@/lib/hedera/config";
import { relativeTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Certificates" };

function pretty(value: string): string {
  return value.replace(/_/g, " ").replace(/^./, (letter) => letter.toUpperCase());
}

export default async function AdminCertificatesPage() {
  const facts = adminCertificateFacts();
  const rows = adminCertificates(24);
  const security = adminSecurityFacts();
  const hedera = hederaStatus();
  const active = facts.status.find((row) => row.label === "active")?.value ?? 0;
  const revoked = facts.status.find((row) => row.label === "revoked")?.value ?? 0;
  const confirmed = facts.anchorStatus.find((row) => row.label === "confirmed")?.value ?? 0;

  return (
    <div className="space-y-6">
      <ConsoleHeader
        eyebrow="People and proof"
        title="Signed certificates"
        description="Every certificate is a signed record of a claim, its confidence and its limitations. A certificate is never a grade, and nothing is marked anchored to Hedera without a topic sequence number from the network."
        actions={<Badge tone="warning">Read-only</Badge>}
        meta={
          <div className="flex flex-wrap items-center gap-2 text-[0.6875rem] text-muted">
            <Badge tone="primary">{count(facts.total)} total</Badge>
            <Badge tone="success">{count(active)} active</Badge>
            {revoked > 0 ? <Badge tone="danger">{count(revoked)} revoked</Badge> : null}
            <Badge tone={hedera.configured ? "success" : "warning"}>
              {hedera.configured ? `Hedera ${hedera.network}` : "Hedera unavailable"}
            </Badge>
            <span className="ml-auto">{count(confirmed)} with a receipt</span>
          </div>
        }
      />

      <Reveal>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi
            label="Certificates"
            value={count(facts.total)}
            hint={`${count(active)} active · ${count(revoked)} revoked`}
          />
          <Kpi
            label="Anchored"
            value={percent(confirmed, facts.total)}
            hint="confirmed only with a sequence number"
            accent="var(--success)"
          />
          <Kpi
            label="Anchor mechanism"
            value={hedera.configured ? "Hedera" : "Local only"}
            hint={hedera.configured ? hedera.network : hedera.missing.join(", ")}
            accent="var(--warning)"
          />
          <Kpi
            label="Signing key"
            value={
              security.certificateKeySource === "environment"
                ? "Env"
                : security.certificateKeySource === "not created yet"
                  ? "None"
                  : "DB"
            }
            hint={security.certificateKeySource}
            accent={security.certificateKeySource === "environment" ? "var(--success)" : "var(--warning)"}
          />
        </div>
      </Reveal>

      <div className="grid gap-4 xl:grid-cols-3">
        <Reveal>
          <Panel title="Status" description="Revocation keeps the row: a revoked certificate remains a signed record.">
            <Donut
              segments={facts.status.map((row) => ({
                label: pretty(row.label),
                value: row.value,
                tone: row.label === "active" ? "var(--success)" : "var(--danger)",
              }))}
              centerValue={count(facts.total)}
              centerLabel="records"
              size={132}
            />
          </Panel>
        </Reveal>
        <Reveal delay={0.05}>
          <Panel title="Anchor state" description="Where each record stands with the anchoring provider.">
            <BarList
              items={facts.anchorStatus.map((row) => ({
                label: pretty(row.label),
                value: row.value,
              }))}
              tone="var(--accent)"
            />
          </Panel>
        </Reveal>
        <Reveal delay={0.1}>
          <Panel title="Guarantees and gaps" description="What a signature on this instance does and does not prove.">
            <Rows
              items={[
                {
                  label: "Payload signature",
                  value: <Badge tone="success">Ed25519</Badge>,
                  note: "Covers estimate, confidence, limitations and evidence root together.",
                },
                {
                  label: "Hedera receipt",
                  value: hedera.configured ? (
                    <Badge tone="success">Configured</Badge>
                  ) : (
                    <Badge tone="warning">Unavailable</Badge>
                  ),
                  note: hedera.configured
                    ? "A sequence number from consensus is required before status becomes confirmed."
                    : "No operator credentials or topic exist, so no record is claimed as anchored.",
                },
                {
                  label: "Revocation",
                  value: <Badge tone="neutral">Recorded</Badge>,
                  note: "The reason and timestamp are stored; the signature is not rewritten.",
                },
                {
                  label: "External verification",
                  value: <Badge tone="warning">Manual</Badge>,
                  note: "This console can read the record, not re-verify it against a public registry.",
                },
              ]}
            />
          </Panel>
        </Reveal>
      </div>

      <Reveal>
        <Panel
          title="Newest certificates"
          description="The latest 24 records. Sequence numbers are shown only when the network returned one."
          flush
        >
          <div className="p-4">
            {rows.length === 0 ? (
              <p className="py-6 text-center text-[0.8125rem] text-muted">
                No certificate has been issued in this database.
              </p>
            ) : (
              <TableShell minWidth="58rem">
                <thead>
                  <tr>
                    <Th>Record</Th>
                    <Th>Subject</Th>
                    <Th>Skill</Th>
                    <Th>Status</Th>
                    <Th>Anchor</Th>
                    <Th className="text-right">Issued</Th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <Td className="font-mono text-[0.625rem] text-muted">{row.id.slice(0, 18)}…</Td>
                      <Td className="text-[0.75rem]">@{row.subject}</Td>
                      <Td className="text-[0.75rem]">{row.skillId}</Td>
                      <Td>
                        <Badge tone={row.status === "active" ? "success" : "danger"}>
                          {row.status}
                        </Badge>
                        {row.revokedAt ? (
                          <span className="ml-1.5 text-[0.625rem] text-muted">
                            {relativeTime(row.revokedAt)}
                          </span>
                        ) : null}
                      </Td>
                      <Td>
                        <Badge tone={row.anchorStatus === "confirmed" ? "success" : "neutral"}>
                          {row.anchorStatus}
                        </Badge>
                        {row.sequence !== null ? (
                          <span className="ml-1.5 font-mono text-[0.625rem] text-muted">
                            #{row.sequence}
                          </span>
                        ) : null}
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
    </div>
  );
}
