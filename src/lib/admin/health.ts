/**
 * Process facts only. This deployment has no APM, request tracing or log
 * pipeline, so the monitoring page reports what the process can observe about
 * itself and says plainly that request-level telemetry is unavailable.
 */

import os from "node:os";

export interface ProcessHealth {
  pid: number;
  node: string;
  platform: string;
  arch: string;
  uptimeSeconds: number;
  rssBytes: number;
  heapUsedBytes: number;
  heapTotalBytes: number;
  loadAverage: [number, number, number];
  cpuCount: number;
}

export function processHealth(): ProcessHealth {
  const memory = process.memoryUsage();
  const load = os.loadavg();
  return {
    pid: process.pid,
    node: process.version,
    platform: process.platform,
    arch: process.arch,
    uptimeSeconds: Math.round(process.uptime()),
    rssBytes: memory.rss,
    heapUsedBytes: memory.heapUsed,
    heapTotalBytes: memory.heapTotal,
    loadAverage: [load[0] ?? 0, load[1] ?? 0, load[2] ?? 0],
    cpuCount: os.cpus().length,
  };
}
