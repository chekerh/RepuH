import type { Metadata } from "next";
import { BarList, Donut, Sparkline } from "@/components/admin/charts";
import { Reveal } from "@/components/admin/reveal";
import { ConsoleHeader, Kpi, Panel, TableShell, Td, Th } from "@/components/admin/ui";
import { Badge } from "@/components/ui";
import { count, percent } from "@/lib/admin/format";
import {
  adminDailySeries,
  adminEvidenceBreakdown,
  adminRecentEvidence,
} from "@/lib/db/admin";
import { relativeTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Evidence" };

export default async function AdminEvidencePage() {
  const breakdown = adminEvidenceBreakdown();
  const recent = adminRecentEvidence(24);
  const series = adminDailySeries(14);
  const real = breakdown.total - breakdown.demo;
  const verified = breakdown.verification.find((row) => row.label === "Verified")?.value ?? 0;
  const visible = breakdown.visibility
    .filter((row) => row.label !== "Private")
    .reduce((sum, row) => sum + row.value, 0);

  return (
    <div className="space-y-6">
      <ConsoleHeader
        eyebrow="People and proof"
        title="Evidence catalogue"
        description="What the pipeline has actually ingested: signals, skills, verification state and who can read each row. Counts come from the evidence table; no scoring, grading or composite number is shown here."
        actions={<Badge tone="neutral">Attributable work only</Badge>}
        meta={
          <div className="flex flex-wrap items-center gap-2 text-[0.6875rem] text-muted">
            <Badge tone="primary">{count(breakdown.total)} rows</Badge>
            <Badge tone="success">{count(verified)} verified</Badge>
            <Badge tone="warning">{count(breakdown.demo)} demo</Badge>
            <Badge tone="neutral">{breakdown.skills.length} skills in view</Badge>
            <span className="ml-auto">{percent(visible, breakdown.total)} shared</span>
          </div>
        }
      />

      <Reveal>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi
            label="Evidence rows"
            value={count(breakdown.total)}
            hint={`${count(real)} real · ${count(breakdown.demo)} demo`}
            visual={<Sparkline values={series.map((point) => point.evidence)} />}
          />
          <Kpi
            label="Verified"
            value={percent(verified, breakdown.total)}
            hint={`${count(verified)} rows with a verified state`}
            accent="var(--success)"
          />
          <Kpi
            label="Shared"
            value={percent(visible, breakdown.total)}
            hint={`${count(visible)} public or selective`}
            accent="var(--accent)"
          />
          <Kpi
            label="Demo share"
            value={percent(breakdown.demo, breakdown.total)}
            hint="Labelled rows, excluded from public projections"
            accent="var(--warning)"
          />
        </div>
      </Reveal>

      <div className="grid gap-4 xl:grid-cols-2">
        <Reveal>
          <Panel
            title="Skills referenced"
            description="A row can support more than one skill, so this total can exceed the evidence count. Top eight only."
          >
            <BarList items={breakdown.skills} />
          </Panel>
        </Reveal>
        <Reveal delay={0.05}>
          <Panel
            title="Signals"
            description="The signal recorded with each row when it was ingested."
          >
            <BarList items={breakdown.signals} tone="var(--accent)" />
          </Panel>
        </Reveal>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Reveal>
          <Panel title="Verification" description="How much of the catalogue has been checked.">
            <Donut
              segments={breakdown.verification.map((row) => ({
                label: row.label,
                value: row.value,
                tone: row.label === "Verified" ? "var(--success)" : "var(--muted)",
              }))}
              centerValue={percent(verified, breakdown.total)}
              centerLabel="verified"
              size={132}
            />
          </Panel>
        </Reveal>
        <Reveal delay={0.05}>
          <Panel title="Visibility" description="Who can read each row once it is published.">
            <Donut
              segments={breakdown.visibility.map((row) => ({
                label: row.label,
                value: row.value,
                tone:
                  row.label === "Public"
                    ? "var(--primary)"
                    : row.label === "Selective"
                      ? "var(--accent)"
                      : "var(--muted)",
              }))}
              centerValue={count(breakdown.total)}
              centerLabel="rows"
              size={132}
            />
          </Panel>
        </Reveal>
        <Reveal delay={0.1}>
          <Panel title="Limitations" description="Stated here because the numbers above depend on them.">
            <ul className="space-y-2.5 text-[0.75rem] leading-relaxed text-muted">
              <li>
                Evidence is only as complete as the connected sources. A provider that is not
                configured contributes nothing rather than a placeholder row.
              </li>
              <li>
                Demo rows are real database rows carrying <code className="font-mono">is_demo = 1</code>.
                They are counted, labelled and never merged into public projections.
              </li>
              <li>
                A verified state reflects the ingestion rules, not an external audit of the work.
              </li>
            </ul>
          </Panel>
        </Reveal>
      </div>

      <Reveal>
        <Panel
          title="Newest rows"
          description="The latest 24 evidence records. Titles are user-supplied and shown verbatim."
          flush
        >
          <div className="p-4">
            {recent.length === 0 ? (
              <p className="py-6 text-center text-[0.8125rem] text-muted">
                No evidence has been ingested yet.
              </p>
            ) : (
              <TableShell minWidth="56rem">
                <thead>
                  <tr>
                    <Th>Title</Th>
                    <Th>Owner</Th>
                    <Th>Signal</Th>
                    <Th>Verification</Th>
                    <Th>Visibility</Th>
                    <Th className="text-right">When</Th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((row) => (
                    <tr key={row.id}>
                      <Td className="max-w-[20rem]">
                        <span className="block truncate">{row.title}</span>
                        <span className="font-mono text-[0.625rem] text-muted">
                          {row.id.slice(0, 14)}…
                        </span>
                      </Td>
                      <Td className="font-mono text-[0.6875rem] text-muted">
                        {row.owner ? `@${row.owner}` : "—"}
                      </Td>
                      <Td className="text-[0.75rem]">{row.signal}</Td>
                      <Td>
                        <Badge tone={row.verificationState === "verified" ? "success" : "neutral"}>
                          {row.verificationState}
                        </Badge>
                      </Td>
                      <Td className="text-[0.75rem] text-muted">
                        {row.visibility}
                        {row.isDemo ? <Badge tone="warning" className="ml-1.5">Demo</Badge> : null}
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
