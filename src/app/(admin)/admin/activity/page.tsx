import type { Metadata } from "next";
import { Heatmap } from "@/components/admin/charts";
import { Reveal } from "@/components/admin/reveal";
import {
  ConsoleHeader,
  Delta,
  Kpi,
  Panel,
  TableShell,
  Td,
  Th,
} from "@/components/admin/ui";
import { Badge } from "@/components/ui";
import { count } from "@/lib/admin/format";
import {
  adminAuditLog,
  adminDeltas,
  adminHeatmap,
  adminRecentEvents,
} from "@/lib/db/admin";
import { relativeTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Activity" };

export default async function AdminActivityPage() {
  const heatmap = adminHeatmap(14);
  const events = adminRecentEvents(20);
  const audit = adminAuditLog(20);
  const deltas = adminDeltas();
  const heatTotal = heatmap.reduce(
    (sum, cell) => sum + cell.buckets.reduce((inner, value) => inner + value, 0),
    0,
  );

  return (
    <div className="space-y-6">
      <ConsoleHeader
        eyebrow="Observe"
        title="Activity and audit trail"
        description="Two different records, kept apart: ingested activity events describe work, while audit logs describe writes to this application. Neither is a visitor analytics stream, and no event payload is rendered here."
        actions={<Badge tone="neutral">Last 14 days</Badge>}
        meta={
          <div className="flex flex-wrap items-center gap-2 text-[0.6875rem] text-muted">
            <Badge tone="primary">{count(heatTotal)} events in window</Badge>
            <Badge tone="neutral">{count(events.length)} shown below</Badge>
            <Badge tone="neutral">{count(audit.length)} audit rows</Badge>
          </div>
        }
      />

      <Reveal>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi
            label="Events, 7 days"
            value={count(deltas.events.current)}
            footnote={
              <Delta current={deltas.events.current} previous={deltas.events.previous} />
            }
          />
          <Kpi
            label="Accounts, 7 days"
            value={count(deltas.accounts.current)}
            footnote={
              <Delta current={deltas.accounts.current} previous={deltas.accounts.previous} />
            }
          />
          <Kpi
            label="Evidence, 7 days"
            value={count(deltas.evidence.current)}
            footnote={
              <Delta current={deltas.evidence.current} previous={deltas.evidence.previous} />
            }
            accent="var(--accent)"
          />
          <Kpi
            label="Window total"
            value={count(heatTotal)}
            hint="activity events, 14 UTC days"
          />
        </div>
      </Reveal>

      <Reveal delay={0.05}>
        <Panel
          title="When work happens"
          description="Activity events per two-hour bucket. A blank cell is a real zero, not missing data."
        >
          <Heatmap cells={heatmap} label="Activity events per two-hour bucket over 14 days" />
        </Panel>
      </Reveal>

      <div className="grid gap-4 xl:grid-cols-2">
        <Reveal>
          <Panel
            title="Ingested events"
            description="The newest activity rows. Payloads are intentionally not rendered."
            flush
          >
            <div className="p-4">
              {events.length === 0 ? (
                <p className="py-6 text-center text-[0.8125rem] text-muted">
                  No activity has been recorded yet.
                </p>
              ) : (
                <TableShell minWidth="34rem">
                  <thead>
                    <tr>
                      <Th>Event</Th>
                      <Th>Actor</Th>
                      <Th>Processing</Th>
                      <Th className="text-right">When</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((row) => (
                      <tr key={row.id}>
                        <Td>
                          <span className="block text-[0.75rem]">{row.eventType}</span>
                          <span className="flex items-center gap-1 text-[0.625rem] text-muted">
                            {row.source}
                            {row.isDemo ? <Badge tone="warning">Demo</Badge> : null}
                          </span>
                        </Td>
                        <Td className="max-w-[12rem] truncate font-mono text-[0.625rem] text-muted">
                          {row.actor ?? "deleted account"}
                        </Td>
                        <Td>
                          <Badge tone={row.processingStatus === "processed" ? "success" : "neutral"}>
                            {row.processingStatus}
                          </Badge>
                        </Td>
                        <Td className="whitespace-nowrap text-right text-[0.625rem] text-muted">
                          {relativeTime(row.occurredAt)}
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
            title="Audit log"
            description="Application writes, newest first. Metadata is omitted because it can contain user content."
            flush
          >
            <div className="p-4">
              {audit.length === 0 ? (
                <p className="py-6 text-center text-[0.8125rem] text-muted">
                  No audit events have been recorded yet.
                </p>
              ) : (
                <TableShell minWidth="34rem">
                  <thead>
                    <tr>
                      <Th>Action</Th>
                      <Th>Actor</Th>
                      <Th>Target</Th>
                      <Th className="text-right">When</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {audit.map((row) => (
                      <tr key={row.id}>
                        <Td className="font-mono text-[0.6875rem]">{row.action}</Td>
                        <Td className="max-w-[10rem] truncate text-[0.625rem] text-muted">
                          {row.actor ?? "system"}
                        </Td>
                        <Td className="max-w-[8rem] truncate font-mono text-[0.625rem] text-muted">
                          {row.target ?? "—"}
                        </Td>
                        <Td className="whitespace-nowrap text-right text-[0.625rem] text-muted">
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
    </div>
  );
}
