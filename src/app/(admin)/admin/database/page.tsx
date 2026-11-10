import type { Metadata } from "next";
import { BarList, ProgressRow } from "@/components/admin/charts";
import { Reveal } from "@/components/admin/reveal";
import { ConsoleHeader, Kpi, Panel, Rows } from "@/components/admin/ui";
import { Badge } from "@/components/ui";
import { bytes, count, milliseconds } from "@/lib/admin/format";
import {
  adminDatabaseFacts,
  adminDatabaseLatency,
  adminTableCounts,
} from "@/lib/db/admin";

export const metadata: Metadata = { title: "Database" };

export default async function AdminDatabasePage() {
  const facts = adminDatabaseFacts();
  const latency = adminDatabaseLatency();
  const tables = adminTableCounts().sort((a, b) => b.rows - a.rows);
  const totalRows = tables.reduce((sum, table) => sum + table.rows, 0);
  const storage =
    (facts.databaseBytes ?? 0) + (facts.walBytes ?? 0) + (facts.shmBytes ?? 0);
  const healthy = facts.quickCheck === "ok";

  return (
    <div className="space-y-6">
      <ConsoleHeader
        eyebrow="Platform"
        title="Database"
        description="The SQLite file this instance owns: table volumes, storage split, pragma state and a single round-trip latency. The console never runs a write, a VACUUM or arbitrary SQL."
        actions={
          <Badge tone={healthy ? "success" : "danger"}>
            quick_check {facts.quickCheck}
          </Badge>
        }
        meta={
          <div className="flex flex-wrap items-center gap-2 text-[0.6875rem] text-muted">
            <Badge tone="neutral">{tables.length} tables</Badge>
            <Badge tone="neutral">{count(totalRows)} rows</Badge>
            <Badge tone="neutral">{facts.journalMode.toUpperCase()} journal</Badge>
            <span className="ml-auto font-mono">{facts.path}</span>
          </div>
        }
      />

      <Reveal>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi
            label="File size"
            value={bytes(facts.databaseBytes)}
            hint={`${count(facts.pageCount)} pages · ${count(facts.pageSize)} B each`}
          />
          <Kpi
            label="Write-ahead log"
            value={bytes(facts.walBytes)}
            hint={`${bytes(facts.shmBytes)} shared memory`}
            accent="var(--accent)"
          />
          <Kpi
            label="Free pages"
            value={count(facts.freelistCount)}
            hint="freelist_count"
            accent="var(--muted)"
          />
          <Kpi
            label="Round trip"
            value={milliseconds(latency)}
            hint="one SELECT 1, not a benchmark"
            accent={latency < 5 ? "var(--success)" : "var(--warning)"}
          />
        </div>
      </Reveal>

      <div className="grid gap-4 xl:grid-cols-3">
        <Reveal className="xl:col-span-2">
          <Panel
            title="Rows by table"
            description="Counts are exact, not estimates from a planner. Tables with zero rows are real empty tables."
          >
            <BarList
              items={tables.map((table) => ({ label: table.table, value: table.rows }))}
            />
          </Panel>
        </Reveal>

        <Reveal delay={0.05}>
          <Panel title="Pragma facts" description="Read directly from the open connection.">
            <Rows
              items={[
                {
                  label: "Journal mode",
                  value: <Badge tone="success">{facts.journalMode}</Badge>,
                  note: "WAL allows concurrent readers during a write.",
                },
                { label: "Page size", value: `${count(facts.pageSize)} B` },
                { label: "Page count", value: count(facts.pageCount) },
                { label: "Freelist", value: count(facts.freelistCount) },
                {
                  label: "Foreign keys",
                  value: (
                    <Badge tone={facts.foreignKeys ? "success" : "danger"}>
                      {facts.foreignKeys ? "ON" : "OFF"}
                    </Badge>
                  ),
                  note: "Cascades depend on this being enabled per connection.",
                },
                { label: "Schema version", value: facts.schemaVersion },
                {
                  label: "Integrity",
                  value: (
                    <Badge tone={healthy ? "success" : "danger"}>{facts.quickCheck}</Badge>
                  ),
                  note: "quick_check reads the whole file; it is not a backup.",
                },
              ]}
            />
          </Panel>
        </Reveal>
      </div>

      <Reveal>
        <Panel
          title="Storage composition"
          description="The database is a local file plus its write-ahead log. There is no object store or managed database to reconcile."
        >
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
            <ProgressRow
              label="Shared memory"
              value={facts.shmBytes ?? 0}
              total={Math.max(storage, 1)}
              tone="var(--muted)"
              suffix={bytes(facts.shmBytes)}
            />
            <p className="text-[0.6875rem] leading-relaxed text-muted">
              Total on disk: <span className="num text-foreground">{bytes(storage)}</span>. Deleting a
              row does not shrink the file until a checkpoint and VACUUM run outside this console.
            </p>
          </div>
        </Panel>
      </Reveal>
    </div>
  );
}
