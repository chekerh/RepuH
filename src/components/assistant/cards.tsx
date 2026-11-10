"use client";

import Link from "next/link";
import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { Badge, Button, ConfidenceMeter } from "@/components/ui";
import type { Card } from "@/lib/assistant/types";
import { cn } from "@/lib/utils";

/**
 * Results are rendered as ruled tables, not a stack of floating cards: the
 * hairline is the container, so a number and its limits stay visually attached
 * to the claim they qualify.
 */
export function ResultCards({
  cards,
  onCommand,
  disabled,
}: {
  cards: Card[];
  onCommand: (command: string, confirmed?: boolean) => void;
  disabled?: boolean;
}) {
  const reduced = useReducedMotion();
  const [cancelled, setCancelled] = useState<number[]>([]);

  return (
    <div className="mt-5 space-y-6">
      {cards.map((card, index) => {
        const delay = reduced ? 0 : Math.min(index * 0.05, 0.2);

        return (
          <motion.div
            key={`${card.kind}-${index}`}
            initial={reduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32, delay, ease: [0.22, 1, 0.36, 1] }}
          >
            {card.kind === "stats" ? (
              <dl className="grid grid-cols-2 gap-px border border-border bg-border sm:grid-cols-4">
                {card.items.map((item) => (
                  <div key={item.label} className="bg-surface px-4 py-4">
                    <dd className="font-display text-[1.75rem] leading-none tracking-tight">
                      {item.value}
                    </dd>
                    <dt className="mt-2 text-[0.8125rem] text-foreground">{item.label}</dt>
                    {item.note ? (
                      <p className="mt-0.5 text-xs leading-snug text-muted">{item.note}</p>
                    ) : null}
                  </div>
                ))}
              </dl>
            ) : null}

            {card.kind === "signals" ? (
              <section className="border-t border-border pt-4">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <h3 className="text-sm font-medium">{card.title}</h3>
                  {card.subtitle ? (
                    <p className="text-xs text-muted">{card.subtitle}</p>
                  ) : null}
                </div>
                <ul className="mt-2">
                  {card.rows.map((row) => (
                    <li
                      key={row.id}
                      className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-t border-border py-3 first:border-t-0 sm:grid-cols-[minmax(0,1fr)_7rem_4rem]"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm text-foreground">{row.name}</p>
                        <p className="mt-0.5 text-xs text-muted">
                          {row.group.replace(/-/g, " ")} · {row.evidence} evidence
                        </p>
                      </div>
                      <ConfidenceMeter
                        value={row.confidence}
                        className="hidden sm:flex"
                        label={`${row.name} confidence`}
                      />
                      <span className="num justify-self-end text-lg" title="Estimate">
                        {row.estimate ?? "—"}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-muted">
                  The right-hand number is an estimate, not a rank. An em dash means it is not established.
                </p>
              </section>
            ) : null}

            {card.kind === "activity" || card.kind === "list" ? (
              <section className="border-t border-border pt-4">
                <h3 className="text-sm font-medium">{card.title}</h3>
                {card.rows.length === 0 ? (
                  <p className="mt-2 text-sm leading-relaxed text-muted">
                    {card.empty}
                  </p>
                ) : (
                  <ul className="mt-2">
                    {card.rows.map((row) => (
                      <li
                        key={row.id}
                        className="flex items-start justify-between gap-4 border-t border-border py-3 first:border-t-0"
                      >
                        <div className="min-w-0">
                          <p className="text-sm leading-snug text-foreground">
                            {"primary" in row ? row.primary : row.title}
                          </p>
                          <p className="mt-0.5 text-xs text-muted">
                            {"primary" in row
                              ? row.secondary
                              : [row.repo, row.when].filter(Boolean).join(" · ")}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          {"demo" in row && row.demo ? (
                            <Badge tone="warning">Demo</Badge>
                          ) : null}
                          <Badge tone="neutral">
                            {"tag" in row && row.tag ? row.tag : "type" in row ? row.type : ""}
                          </Badge>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ) : null}

            {card.kind === "navigate" ? (
              <Link
                href={card.href}
                className="group inline-flex items-center gap-1.5 border-b border-primary/30 pb-0.5 text-sm font-medium text-primary transition-colors hover:border-primary"
              >
                {card.label}
                <ArrowUpRight
                  size={14}
                  aria-hidden
                  className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                />
              </Link>
            ) : null}

            {card.kind === "confirm" ? (
              <div className="border-l-2 border-primary bg-primary-soft/40 py-3 pl-4">
                <p className="text-sm font-medium">{card.label}</p>
                <p className="mt-1 max-w-[62ch] text-xs leading-relaxed text-muted">
                  {card.description}
                </p>
                {/* Resolve the prompt in place. Removing the card would leave
                    the reply still telling the reader to confirm something
                    with no control left to do it. */}
                {cancelled.includes(index) ? (
                  <p className="mt-3 text-xs text-muted">Cancelled. Nothing changed.</p>
                ) : (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      disabled={disabled}
                      onClick={() => onCommand(card.command, true)}
                    >
                      {card.label}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setCancelled((current) => [...current, index])}
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            ) : null}
          </motion.div>
        );
      })}
    </div>
  );
}

/** Small helper so the rail and the reply share one confidence vocabulary. */
export function RailSignal({
  name,
  confidence,
  estimate,
  className,
}: {
  name: string;
  confidence: number;
  estimate: number | null;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="truncate text-xs text-foreground">{name}</span>
        <span className="num text-xs text-muted">{estimate ?? "—"}</span>
      </div>
      <ConfidenceMeter value={confidence} label={`${name} confidence`} />
    </div>
  );
}
