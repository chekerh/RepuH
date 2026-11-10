import type { Metadata } from "next";
import { ProgressRow, Sparkline } from "@/components/admin/charts";
import { Reveal } from "@/components/admin/reveal";
import { ConsoleHeader, Kpi, Panel, Rows } from "@/components/admin/ui";
import { Badge } from "@/components/ui";
import { bytes, duration, milliseconds } from "@/lib/admin/format";
import { processHealth } from "@/lib/admin/health";
import { adminDatabaseFacts, adminDatabaseLatency } from "@/lib/db/admin";
import { env } from "@/lib/env";
import { hederaStatus } from "@/lib/hedera/config";

export const metadata: Metadata = { title: "Monitoring" };

export default async function AdminMonitoringPage() {
  const health = processHealth();
  const database = adminDatabaseFacts();
  const latency = adminDatabaseLatency();
  const hedera = hederaStatus();
  const heapShare = health.heapTotalBytes > 0 ? health.heapUsedBytes / health.heapTotalBytes : 0;
  const rssShare = health.rssBytes > 0 ? health.heapUsedBytes / health.rssBytes : 0;

  return (
    <div className="space-y-6">
      <ConsoleHeader
        eyebrow="Platform"
        title="Process health"
        description="What this Node process is doing right now: memory, uptime and event-loop-adjacent facts read from the runtime. This is a point-in-time snapshot, not an uptime monitor and not a time series."
        actions={<Badge tone="success">Running</Badge>}
        meta={
          <div className="flex flex-wrap items-center gap-2 text-[0.6875rem] text-muted">
            <Badge tone="neutral">pid {health.pid}</Badge>
            <Badge tone="neutral">Node {health.node}</Badge>
            <Badge tone="neutral">
              {health.platform}/{health.arch}
            </Badge>
            <span className="ml-auto">up {duration(health.uptimeSeconds)}</span>
          </div>
        }
      />

      <Reveal>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          <Kpi label="Uptime" value={duration(health.uptimeSeconds)} hint="since process start" />
          <Kpi
            label="Resident memory"
            value={bytes(health.rssBytes)}
            hint={`${bytes(health.heapUsedBytes)} JS heap in use`}
          />
          <Kpi
            label="Heap used"
            value={`${Math.round(heapShare * 100)}%`}
            hint={`${bytes(health.heapUsedBytes)} of ${bytes(health.heapTotalBytes)}`}
            accent={heapShare > 0.85 ? "var(--warning)" : "var(--success)"}
          />
          <Kpi
            label="Load (1m)"
            value={health.loadAverage[0]?.toFixed(2) ?? "—"}
            hint={`${health.cpuCount} CPUs · 5m ${health.loadAverage[1]?.toFixed(2) ?? "—"}`}
            visual={<Sparkline values={health.loadAverage} tone="var(--accent)" />}
          />
          <Kpi
            label="DB round trip"
            value={milliseconds(latency)}
            hint={`${database.journalMode} · ${database.quickCheck}`}
            accent={latency < 5 ? "var(--success)" : "var(--warning)"}
          />
          <Kpi
            label="Hedera"
            value={hedera.configured ? "Ready" : "Off"}
            hint={hedera.configured ? hedera.network : "operator credentials missing"}
            accent={hedera.configured ? "var(--success)" : "var(--warning)"}
          />
        </div>
      </Reveal>

      <div className="grid gap-4 xl:grid-cols-3">
        <Reveal className="xl:col-span-2">
          <Panel
            title="Memory"
            description="V8 reports heap use against a reserved allocation; RSS includes native memory such as SQLite."
          >
            <div className="space-y-5">
              <ProgressRow
                label="JS heap used"
                value={health.heapUsedBytes}
                total={Math.max(health.heapTotalBytes, 1)}
                tone="var(--primary)"
                suffix={bytes(health.heapTotalBytes)}
              />
              <ProgressRow
                label="Heap inside resident memory"
                value={health.heapUsedBytes}
                total={Math.max(health.rssBytes, 1)}
                tone="var(--accent)"
                suffix={bytes(health.rssBytes)}
              />
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  ["Heap used", bytes(health.heapUsedBytes)],
                  ["Heap total", bytes(health.heapTotalBytes)],
                  ["RSS", bytes(health.rssBytes)],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xs border border-border px-3 py-2">
                    <p className="label">{label}</p>
                    <p className="num mt-1 text-[0.9375rem]">{value}</p>
                  </div>
                ))}
              </div>
              <p className="text-[0.6875rem] leading-relaxed text-muted">
                {Math.round(rssShare * 100)}% of resident memory is attributed to the JS heap. The
                remainder is native memory, including the SQLite page cache. A restart clears both.
              </p>
            </div>
          </Panel>
        </Reveal>

        <Reveal delay={0.05}>
          <Panel title="Runtime" description="Facts read from the process, not configured by hand.">
            <Rows
              items={[
                { label: "PID", value: String(health.pid) },
                { label: "Node", value: health.node },
                { label: "Platform", value: `${health.platform} ${health.arch}` },
                { label: "CPUs", value: String(health.cpuCount) },
                {
                  label: "Load average",
                  value: health.loadAverage.map((value) => value.toFixed(2)).join(" · "),
                  note: "1m · 5m · 15m, as reported by the OS.",
                },
                { label: "Uptime", value: duration(health.uptimeSeconds) },
              ]}
            />
          </Panel>
        </Reveal>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Reveal>
          <Panel title="Configuration" description="Capabilities that change what this instance can do.">
            <Rows
              items={[
                {
                  label: "Development adapter",
                  value: env.demoMode ? (
                    <Badge tone="warning">Enabled</Badge>
                  ) : (
                    <Badge tone="success">Disabled</Badge>
                  ),
                  note: "REPUH_DEMO_MODE seeds labelled demo rows on an empty database.",
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
                },
                {
                  label: "Application URL",
                  value: <span className="font-mono text-[0.75rem]">{env.appUrl}</span>,
                },
              ]}
            />
          </Panel>
        </Reveal>
        <Reveal delay={0.05}>
          <Panel title="What this page is not" description="Stated to keep the snapshot honest.">
            <ul className="space-y-2.5 text-[0.75rem] leading-relaxed text-muted">
              <li>There is no metrics history: each render reads the process once, so no trend is implied.</li>
              <li>No alerting or external monitor is configured. Nothing will page you if this process exits.</li>
              <li>
                Latency is a single <span className="font-mono">SELECT 1</span> on the local file. It is
                not a p95 and does not describe user-facing request time.
              </li>
              <li>Error rates are not collected; the app writes failures to its log, not to a counter.</li>
            </ul>
          </Panel>
        </Reveal>
      </div>
    </div>
  );
}
