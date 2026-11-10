import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui";

/* --------------------------------------------------------------- page header */

export function ConsoleHeader({
  eyebrow,
  title,
  description,
  actions,
  meta,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
  meta?: ReactNode;
}) {
  return (
    <header className="relative overflow-hidden border-b border-border pb-6">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-28 h-64 w-64 rounded-full opacity-70 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, color-mix(in srgb, var(--primary) 22%, transparent), transparent 68%)",
        }}
      />
      <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
        <div className="min-w-0">
          <p className="label">{eyebrow}</p>
          <h1 className="display mt-2 text-[clamp(1.9rem,3.4vw,2.6rem)]">{title}</h1>
          <p className="mt-2.5 max-w-[70ch] text-[0.8125rem] leading-relaxed text-muted">
            {description}
          </p>
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {meta ? <div className="relative mt-5">{meta}</div> : null}
    </header>
  );
}

/* --------------------------------------------------------------------- panel */

export function Panel({
  title,
  description,
  actions,
  children,
  className,
  flush,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  flush?: boolean;
}) {
  return (
    <section
      className={cn(
        "flex min-w-0 flex-col rounded-sm border border-border bg-surface",
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <h2 className="text-[0.8125rem] font-medium tracking-tight">{title}</h2>
          {description ? (
            <p className="mt-0.5 max-w-[68ch] text-[0.75rem] leading-relaxed text-muted">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>
      <div className={cn("min-w-0 flex-1", flush ? "" : "p-4")}>{children}</div>
    </section>
  );
}

/* ----------------------------------------------------------------------- kpi */

export function Delta({
  current,
  previous,
  invert = false,
  suffix = "vs previous 7 days",
}: {
  current: number;
  previous: number;
  invert?: boolean;
  suffix?: string;
}) {
  if (previous === 0 && current === 0) {
    return <span className="text-[0.6875rem] text-muted">no change</span>;
  }
  const diff = current - previous;
  const good = invert ? diff <= 0 : diff >= 0;
  const text = previous === 0 ? "new" : `${diff > 0 ? "+" : ""}${diff}`;
  return (
    <span className="inline-flex items-baseline gap-1 text-[0.6875rem]">
      <span className={cn("num font-medium", good ? "text-success" : "text-danger")}>{text}</span>
      <span className="text-muted">{suffix}</span>
    </span>
  );
}

export function Kpi({
  label,
  value,
  hint,
  footnote,
  visual,
  accent = "var(--primary)",
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  footnote?: ReactNode;
  visual?: ReactNode;
  accent?: string;
}) {
  return (
    <div className="group relative flex min-w-0 flex-col overflow-hidden rounded-sm border border-border bg-surface p-4">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-60 transition-opacity group-hover:opacity-100"
        style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }}
      />
      <div className="flex items-start justify-between gap-2">
        <p className="label">{label}</p>
        <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ background: accent }} />
      </div>
      <p className="num mt-2 text-[1.75rem] font-medium leading-none tracking-tight">{value}</p>
      {hint ? <p className="mt-1.5 text-[0.75rem] text-muted">{hint}</p> : null}
      {visual ? <div className="mt-3 -mb-1">{visual}</div> : null}
      {footnote ? <div className="mt-auto pt-2.5">{footnote}</div> : null}
    </div>
  );
}

export function MetricGrid({
  items,
  columns = 3,
}: {
  items: Array<{
    label: string;
    value: ReactNode;
    hint?: ReactNode;
    footnote?: ReactNode;
    visual?: ReactNode;
    accent?: string;
  }>;
  columns?: number;
}) {
  const gridClass =
    columns >= 6
      ? "grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
      : columns === 4
        ? "grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
        : columns === 2
          ? "grid gap-3 sm:grid-cols-2"
          : "grid gap-3 sm:grid-cols-2 lg:grid-cols-3";
  return (
    <div className={gridClass}>
      {items.map((item, index) => (
        <Kpi
          key={`${item.label}-${index}`}
          label={item.label}
          value={item.value}
          hint={item.hint}
          footnote={item.footnote}
          visual={item.visual}
          accent={item.accent}
        />
      ))}
    </div>
  );
}

export function Rows({
  items,
}: {
  items: Array<{ label: string; value: ReactNode; note?: string }>;
}) {
  return (
    <dl className="divide-y divide-border text-[0.8125rem]">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex flex-col gap-0.5 py-2 first:pt-0 last:pb-0 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6"
        >
          <dt className="min-w-0 text-muted">
            {item.label}
            {item.note ? (
              <span className="mt-0.5 block max-w-[60ch] text-[0.6875rem] leading-relaxed text-muted/80">
                {item.note}
              </span>
            ) : null}
          </dt>
          <dd className="shrink-0 font-medium sm:text-right">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Bar({
  value,
  max,
  tone = "var(--primary)",
}: {
  value: number;
  max: number;
  tone?: string;
}) {
  const width = max > 0 ? Math.max((value / max) * 100, value > 0 ? 1.5 : 0) : 0;
  return (
    <span className="block h-1.5 w-full overflow-hidden rounded-full bg-surface-muted" aria-hidden>
      <span
        className="block h-full rounded-full transition-[width]"
        style={{ width: `${width}%`, background: tone }}
      />
    </span>
  );
}

/* -------------------------------------------------------------------- tables */

export function TableShell({
  children,
  minWidth = "48rem",
}: {
  children: ReactNode;
  minWidth?: string;
}) {
  return (
    <div className="-mx-4 overflow-x-auto px-4">
      <table className="w-full border-collapse text-left text-[0.8125rem]" style={{ minWidth }}>
        {children}
      </table>
    </div>
  );
}

export function Th({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <th
      scope="col"
      className={cn(
        "border-b border-border py-2 pr-4 text-[0.625rem] font-medium uppercase tracking-[0.08em] text-muted",
        className,
      )}
    >
      {children}
    </th>
  );
}

export function Td({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <td className={cn("border-b border-border py-2.5 pr-4 align-middle", className)}>{children}</td>
  );
}

/* ----------------------------------------------------------------- misc bits */

export function StateBadge({ ok, children }: { ok: boolean; children: ReactNode }) {
  return <Badge tone={ok ? "success" : "warning"}>{children}</Badge>;
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <p className="border border-dashed border-border-strong px-4 py-8 text-center text-[0.8125rem] text-muted">
      {children}
    </p>
  );
}

export function Avatar({ seed, label }: { seed: string; label: string }) {
  // Deterministic hue from the account id keeps the same person the same colour
  // across pages without storing an avatar.
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) % 360;
  }
  return (
    <span
      aria-hidden
      className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[0.625rem] font-semibold"
      style={{
        background: `color-mix(in srgb, hsl(${hash} 55% 45%) 16%, var(--surface))`,
        color: `hsl(${hash} 45% 36%)`,
      }}
    >
      {label.slice(0, 2).toUpperCase()}
    </span>
  );
}
