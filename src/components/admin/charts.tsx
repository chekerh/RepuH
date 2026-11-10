import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Charts are plain SVG rendered on the server: no chart dependency, no client
 * JavaScript, and every colour resolves through a CSS token so both themes
 * stay consistent.
 */

interface Point {
  x: number;
  y: number;
}

function linePath(points: Point[]): string {
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(1)},${point.y.toFixed(1)}`)
    .join(" ");
}

function smoothPath(points: Point[]): string {
  if (points.length < 3) return linePath(points);
  let d = `M${points[0]?.x ?? 0},${points[0]?.y ?? 0}`;
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    if (!previous || !current) continue;
    const midX = (previous.x + current.x) / 2;
    const midY = (previous.y + current.y) / 2;
    d += ` Q${previous.x.toFixed(1)},${previous.y.toFixed(1)} ${midX.toFixed(1)},${midY.toFixed(1)}`;
  }
  const last = points[points.length - 1];
  if (last) d += ` L${last.x.toFixed(1)},${last.y.toFixed(1)}`;
  return d;
}

function scale(values: number[]): { max: number; min: number } {
  const max = Math.max(...values, 0);
  const min = Math.min(...values, 0);
  return { max: max === min ? max + 1 : max, min };
}

export function Sparkline({
  values,
  tone = "var(--primary)",
  height = 34,
  className,
}: {
  values: number[];
  tone?: string;
  height?: number;
  className?: string;
}) {
  const width = 132;
  const data = values.length > 1 ? values : [0, ...(values.length === 1 ? values : [0])];
  const { max } = scale(data);
  const step = width / Math.max(data.length - 1, 1);
  const points = data.map((value, index) => ({
    x: index * step,
    y: height - (value / max) * (height - 4) - 2,
  }));
  const path = smoothPath(points);
  const last = points[points.length - 1];

  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={cn("h-9 w-full", className)}
    >
      <path
        d={`${path} L${width},${height} L0,${height} Z`}
        fill={tone}
        opacity={0.1}
      />
      <path d={path} fill="none" stroke={tone} strokeWidth={1.5} strokeLinejoin="round" />
      {last ? <circle cx={last.x} cy={last.y} r={2.2} fill={tone} /> : null}
    </svg>
  );
}

export function AreaChart({
  series,
  labels,
  height = 190,
  valueLabel = "records",
}: {
  series: Array<{ label: string; values: number[]; tone: string }>;
  labels: string[];
  height?: number;
  valueLabel?: string;
}) {
  const width = 720;
  const all = series.flatMap((entry) => entry.values);
  const { max } = scale(all);
  const step = width / Math.max((series[0]?.values.length ?? 1) - 1, 1);
  const total = all.reduce((sum, value) => sum + value, 0);

  return (
    <figure className="min-w-0">
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1">
        {series.map((entry) => (
          <span key={entry.label} className="inline-flex items-center gap-1.5 text-[0.6875rem] text-muted">
            <span aria-hidden className="h-1.5 w-3 rounded-full" style={{ background: entry.tone }} />
            {entry.label}
          </span>
        ))}
        <span className="ml-auto text-[0.6875rem] text-muted">
          {total.toLocaleString("en-GB")} {valueLabel} in view
        </span>
      </div>
      <svg
        role="img"
        aria-label={`${series.map((entry) => entry.label).join(" and ")} over ${labels.length} days`}
        viewBox={`0 0 ${width} ${height}`}
        className="h-[190px] w-full"
        preserveAspectRatio="none"
      >
        {[0.25, 0.5, 0.75, 1].map((fraction) => (
          <line
            key={fraction}
            x1={0}
            x2={width}
            y1={height - fraction * (height - 10) - 5}
            y2={height - fraction * (height - 10) - 5}
            stroke="var(--border)"
            strokeWidth={1}
            strokeDasharray={fraction === 1 ? undefined : "3 4"}
          />
        ))}
        {series.map((entry) => {
          const points = entry.values.map((value, index) => ({
            x: index * step,
            y: height - (value / max) * (height - 10) - 5,
          }));
          const path = smoothPath(points);
          const last = points[points.length - 1];
          return (
            <g key={entry.label}>
              <path d={`${path} L${width},${height} L0,${height} Z`} fill={entry.tone} opacity={0.07} />
              <path
                d={path}
                fill="none"
                stroke={entry.tone}
                strokeWidth={1.6}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {last ? <circle cx={last.x} cy={last.y} r={2.4} fill={entry.tone} /> : null}
            </g>
          );
        })}
      </svg>
      <div className="mt-1.5 flex justify-between text-[0.625rem] text-muted">
        <span>{labels[0] ?? ""}</span>
        <span>{labels[Math.floor(labels.length / 2)] ?? ""}</span>
        <span>{labels[labels.length - 1] ?? ""}</span>
      </div>
      <figcaption className="sr-only">
        Peak value {max.toLocaleString("en-GB")} across the window.
      </figcaption>
    </figure>
  );
}

export function BarList({
  items,
  tone = "var(--primary)",
  unit = "",
}: {
  items: Array<{ label: string; value: number; note?: string }>;
  tone?: string;
  unit?: string;
}) {
  const max = Math.max(...items.map((item) => item.value), 1);
  if (items.length === 0) {
    return <p className="py-6 text-center text-[0.8125rem] text-muted">No rows to break down yet.</p>;
  }
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.label} className="min-w-0">
          <div className="flex items-baseline justify-between gap-3 text-[0.8125rem]">
            <span className="truncate" title={item.label}>
              {item.label}
            </span>
            <span className="num shrink-0 text-muted">
              {item.value.toLocaleString("en-GB")}
              {unit ? <span className="ml-0.5 text-[0.625rem]">{unit}</span> : null}
            </span>
          </div>
          <span className="mt-1.5 block h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
            <span
              className="block h-full rounded-full"
              style={{
                width: `${Math.max((item.value / max) * 100, item.value > 0 ? 2 : 0)}%`,
                background: tone,
              }}
            />
          </span>
          {item.note ? <p className="mt-1 text-[0.6875rem] text-muted">{item.note}</p> : null}
        </li>
      ))}
    </ul>
  );
}

export function Donut({
  segments,
  centerValue,
  centerLabel,
  size = 148,
}: {
  segments: Array<{ label: string; value: number; tone: string }>;
  centerValue: string;
  centerLabel: string;
  size?: number;
}) {
  const stroke = 14;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  let offset = 0;

  return (
    <div className="flex items-center gap-5">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg
          role="img"
          aria-label={segments.map((segment) => `${segment.label}: ${segment.value}`).join(", ")}
          viewBox={`0 0 ${size} ${size}`}
          className="h-full w-full -rotate-90"
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--surface-muted)"
            strokeWidth={stroke}
          />
          {total > 0
            ? segments.map((segment) => {
                const length = (segment.value / total) * circumference;
                const dash = `${length} ${circumference - length}`;
                const element = (
                  <circle
                    key={segment.label}
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={segment.tone}
                    strokeWidth={stroke}
                    strokeDasharray={dash}
                    strokeDashoffset={-offset}
                    strokeLinecap="butt"
                  />
                );
                offset += length;
                return element;
              })
            : null}
        </svg>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="num text-xl font-medium leading-none">{centerValue}</p>
            <p className="mt-1 text-[0.625rem] uppercase tracking-[0.08em] text-muted">
              {centerLabel}
            </p>
          </div>
        </div>
      </div>
      <ul className="min-w-0 flex-1 space-y-2 text-[0.75rem]">
        {segments.map((segment) => (
          <li key={segment.label} className="flex items-baseline justify-between gap-2">
            <span className="flex min-w-0 items-center gap-1.5">
              <span
                aria-hidden
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ background: segment.tone }}
              />
              <span className="truncate text-muted">{segment.label}</span>
            </span>
            <span className="num shrink-0">{segment.value.toLocaleString("en-GB")}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Funnel({
  steps,
}: {
  steps: Array<{ label: string; value: number; hint?: string }>;
}) {
  const first = steps[0]?.value ?? 0;
  return (
    <ol className="space-y-3">
      {steps.map((step, index) => {
        const width = first > 0 ? (step.value / first) * 100 : 0;
        const previous = steps[index - 1]?.value ?? first;
        const conversion = previous > 0 ? Math.round((step.value / previous) * 100) : null;
        return (
          <li key={step.label}>
            <div className="flex items-baseline justify-between gap-3 text-[0.8125rem]">
              <span className="truncate">{step.label}</span>
              <span className="num shrink-0 text-muted">
                {step.value.toLocaleString("en-GB")}
                {conversion === null ? null : (
                  <span className="ml-1.5 text-[0.625rem]">{conversion}%</span>
                )}
              </span>
            </div>
            <span className="mt-1.5 block h-2 w-full overflow-hidden rounded-full bg-surface-muted">
              <span
                className="block h-full rounded-full"
                style={{
                  width: `${Math.max(width, step.value > 0 ? 2 : 0)}%`,
                  background: `color-mix(in srgb, var(--primary) ${100 - index * 18}%, var(--accent))`,
                }}
              />
            </span>
            {step.hint ? <p className="mt-1 text-[0.6875rem] text-muted">{step.hint}</p> : null}
          </li>
        );
      })}
    </ol>
  );
}

export function Heatmap({
  cells,
  label,
}: {
  cells: Array<{ date: string; buckets: number[] }>;
  label: string;
}) {
  const max = Math.max(...cells.flatMap((cell) => cell.buckets), 1);
  if (cells.length === 0) {
    return <p className="py-6 text-center text-[0.8125rem] text-muted">No activity recorded yet.</p>;
  }
  return (
    <figure className="min-w-0">
      <div className="min-w-0 overflow-x-auto">
        <div className="min-w-[22rem]">
          {cells.map((cell) => (
            <div key={cell.date} className="flex items-center gap-2">
              <span className="w-14 shrink-0 text-[0.625rem] text-muted">{cell.date.slice(5)}</span>
              <div className="flex flex-1 gap-[2px]">
                {cell.buckets.map((value, index) => (
                  <span
                    key={index}
                    title={`${cell.date} · ${index * 2}:00–${index * 2 + 2}:00 · ${value}`}
                    className="h-3.5 flex-1 rounded-[2px]"
                    style={{
                      background:
                        value === 0
                          ? "var(--surface-muted)"
                          : `color-mix(in srgb, var(--primary) ${Math.round(18 + (value / max) * 72)}%, var(--surface-muted))`,
                    }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between text-[0.625rem] text-muted">
        <span>00:00</span>
        <span className="inline-flex items-center gap-1">
          fewer
          {[0.12, 0.35, 0.6, 0.9].map((ratio) => (
            <span
              key={ratio}
              aria-hidden
              className="h-2.5 w-2.5 rounded-[2px]"
              style={{
                background:
                  ratio === 0.12
                    ? "var(--surface-muted)"
                    : `color-mix(in srgb, var(--primary) ${Math.round(ratio * 100)}%, var(--surface-muted))`,
              }}
            />
          ))}
          more
        </span>
        <span>24:00</span>
      </div>
      <figcaption className="sr-only">{label}</figcaption>
    </figure>
  );
}

export function ProgressRow({
  label,
  value,
  total,
  tone = "var(--primary)",
  suffix,
}: {
  label: string;
  value: number;
  total: number;
  tone?: string;
  suffix?: ReactNode;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-[0.8125rem]">
        <span className="truncate text-muted">{label}</span>
        <span className="num shrink-0">
          {value.toLocaleString("en-GB")}
          <span className="ml-1 text-[0.6875rem] text-muted">{pct}%</span>
        </span>
      </div>
      <span className="mt-1.5 block h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
        <span
          className="block h-full rounded-full"
          style={{ width: `${Math.max(pct, value > 0 ? 2 : 0)}%`, background: tone }}
        />
      </span>
      {suffix ? <div className="mt-1 text-[0.6875rem] text-muted">{suffix}</div> : null}
    </div>
  );
}
