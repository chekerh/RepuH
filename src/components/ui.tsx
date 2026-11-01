import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ button */

type Variant = "primary" | "secondary" | "ghost" | "danger" | "inverse";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-primary text-white hover:bg-primary-strong border border-transparent shadow-[0_1px_0_rgba(255,255,255,0.18)_inset]",
  secondary:
    "bg-surface text-foreground border border-border-strong hover:border-foreground/40 hover:bg-surface-muted",
  ghost: "bg-transparent text-foreground border border-transparent hover:bg-surface-muted",
  danger: "bg-danger text-white border border-transparent hover:opacity-90",
  inverse: "bg-surface-inverse text-background border border-transparent hover:opacity-90",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-3 text-[0.8125rem] gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-12 px-6 text-[0.9375rem] gap-2.5",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cn(
    "inline-flex select-none items-center justify-center rounded-sm font-medium transition-[background-color,border-color,color,transform] duration-150 active:translate-y-px disabled:pointer-events-none disabled:opacity-45",
    VARIANTS[variant],
    SIZES[size],
    className,
  );
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button className={buttonClass(variant, size, className)} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}

/* ------------------------------------------------------------------- field */

export function Field({
  label,
  hint,
  error,
  htmlFor,
  children,
  optional,
}: {
  label: string;
  hint?: string;
  error?: string;
  htmlFor: string;
  children: ReactNode;
  optional?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={htmlFor} className="text-[0.8125rem] font-medium text-foreground">
          {label}
          {optional ? <span className="ml-1.5 text-xs font-normal text-muted">optional</span> : null}
        </label>
        {hint ? <span className="text-xs text-muted">{hint}</span> : null}
      </div>
      {children}
      {error ? (
        // The id lets an input's aria-describedby point here, so a screen
        // reader announces the message with the field rather than only in the
        // page-level summary.
        <p id={`${htmlFor}-error`} role="alert" className="text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

const CONTROL =
  "w-full rounded-sm border border-border-strong bg-surface px-3 py-2 text-sm text-foreground shadow-[0_1px_1px_rgba(21,28,44,0.03)] transition-colors placeholder:text-muted hover:border-muted/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(CONTROL, "h-10", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(CONTROL, "min-h-24 resize-y", className)} {...props} />;
}

export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <select className={cn(CONTROL, "h-10 appearance-none pr-9", className)} {...props}>
      {children}
    </select>
  );
}

/* ------------------------------------------------------------------- badge */

type Tone = "neutral" | "success" | "warning" | "danger" | "primary" | "accent";

const TONES: Record<Tone, string> = {
  neutral: "border-border-strong text-muted",
  success: "border-success/30 bg-success/10 text-success",
  warning: "border-warning/30 bg-warning/10 text-warning",
  danger: "border-danger/30 bg-danger/10 text-danger",
  primary: "border-primary/25 bg-primary-soft text-primary",
  accent: "border-accent/25 bg-accent-soft text-accent",
};

export function Badge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-xs border px-1.5 py-0.5 text-[0.6875rem] font-medium leading-4",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ meter */

/** A confidence readout. The bar is segmented so it reads as a measurement,
 *  not a progress indicator. */
export function ConfidenceMeter({
  value,
  className,
  label = "Confidence",
}: {
  value: number;
  className?: string;
  label?: string;
}) {
  const segments = 10;
  const filled = Math.round(value * segments);
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="sr-only">{`${label}: ${Math.round(value * 100)} percent`}</span>
      <div aria-hidden className="flex items-center gap-[2px]">
        {Array.from({ length: segments }).map((_, index) => (
          <span
            key={index}
            className={cn(
              "h-2 w-[3px] rounded-[1px]",
              index < filled
                ? value >= 0.62
                  ? "bg-success"
                  : value >= 0.4
                    ? "bg-warning"
                    : "bg-danger"
                : "bg-border-strong",
            )}
          />
        ))}
      </div>
      <span className="num text-[0.6875rem] text-muted">{Math.round(value * 100)}%</span>
    </div>
  );
}

/* -------------------------------------------------------------- empty state */

export function EmptyState({
  title,
  body,
  action,
  className,
}: {
  title: string;
  body: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-start gap-3 border border-dashed border-border-strong bg-surface/50 px-6 py-10",
        className,
      )}
    >
      <h3 className="font-display text-2xl leading-tight">{title}</h3>
      <p className="max-w-[52ch] text-sm leading-relaxed text-muted">{body}</p>
      {action}
    </div>
  );
}

/* ------------------------------------------------------------------ misc */

export function SectionRule({ className }: { className?: string }) {
  return <div className={cn("h-px w-full bg-border", className)} />;
}

export function Stat({
  value,
  label,
  hint,
}: {
  value: ReactNode;
  label: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="num text-3xl font-medium tracking-tight">{value}</span>
      <span className="text-[0.8125rem] text-foreground">{label}</span>
      {hint ? <span className="text-xs text-muted">{hint}</span> : null}
    </div>
  );
}
