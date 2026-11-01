"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  CircleCheck,
  Info,
  Loader2,
  ShieldAlert,
  X,
} from "lucide-react";
import { CapabilityLattice, groupColor, type LatticeNode } from "@/components/lattice";
import { Badge, ConfidenceMeter, EmptyState } from "@/components/ui";
import { cn } from "@/lib/utils";

export interface SkillView {
  skillId: string;
  name: string;
  categoryId: string;
  categoryName: string;
  definition: string;
  estimate: number | null;
  confidence: number;
  status: "insufficient" | "provisional" | "established";
  evidenceCount: number;
  projectCount: number;
  sourceCount: number;
  limitations: string[];
  related: string[];
}

interface DetailPayload {
  skill: { id: string; name: string; definition: string; category: string; related: string[] };
  estimate: {
    estimate: number | null;
    confidence: number;
    status: string;
    evidenceCount: number;
    projectCount: number;
    sourceCount: number;
    rationale: string[];
    limitations: string[];
    algorithmVersion: string;
  };
  supporting: Array<{
    id: string;
    title: string;
    summary: string;
    signal: string;
    occurredAt: string;
    projectReference: string | null;
    source: string;
    quality: number;
    visibility: string;
  }>;
  history: Array<{ createdAt: string; estimate: number | null; confidence: number }>;
}

const STATUS_TONE = {
  established: "success",
  provisional: "warning",
  insufficient: "neutral",
} as const;

const STATUS_LABEL = {
  established: "Established",
  provisional: "Provisional",
  insufficient: "Insufficient evidence",
} as const;

export function FingerprintExplorer({
  skills,
  categories,
  evidenceCount,
  initialSkillId,
  algorithmVersion,
}: {
  skills: SkillView[];
  categories: Array<{ id: string; name: string; summary: string }>;
  evidenceCount: number;
  initialSkillId?: string;
  algorithmVersion: string;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(initialSkillId ?? null);
  const [detail, setDetail] = useState<DetailPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const selected = skills.find((skill) => skill.skillId === selectedId) ?? null;

  const nodes: LatticeNode[] = useMemo(() => {
    const maxEvidence = Math.max(...skills.map((skill) => skill.evidenceCount), 1);
    return skills
      .filter((skill) => skill.evidenceCount > 0)
      .map((skill) => ({
        id: skill.skillId,
        label: skill.name,
        group: skill.categoryId,
        weight: 0.25 + (skill.evidenceCount / maxEvidence) * 0.75,
        confidence: skill.confidence,
        score: skill.estimate,
      }));
  }, [skills]);

  useEffect(() => {
    if (!selectedId) {
      // Closing the drawer is an external event (user action), but the state
      // lives here so both close paths share one rule.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDetail(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/fingerprint/${selectedId}`)
      .then(async (response) => {
        const payload = await response.json().catch(() => null);
        if (cancelled) return;
        if (!response.ok) {
          setError(payload?.error?.message ?? "Could not load this capability.");
          return;
        }
        setDetail(payload as DetailPayload);
      })
      .catch(() => {
        if (!cancelled) setError("Network error while loading the capability.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  useEffect(() => {
    if (!selectedId) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedId(null);
    };
    window.addEventListener("keydown", onKey);
    closeRef.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId]);

  const select = useCallback((id: string) => setSelectedId(id), []);

  return (
    <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:gap-12">
      <div className="lg:sticky lg:top-20 lg:self-start">
        <div className="overflow-hidden rounded-md border border-border bg-[#0b1220]">
          <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
            <span className="label text-white/40">Interactive capability map</span>
            <span className="label text-white/25">select a node</span>
          </div>
          <div className="h-[22rem] px-1 pt-1 sm:h-[26rem]">
            <CapabilityLattice
              nodes={nodes}
              selectedId={selectedId}
              onSelect={select}
              caption="Drag to rotate · click to inspect"
              emptyLabel="No attributable evidence"
            />
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-2 border-t border-white/10 px-3 py-2.5">
            {categories.map((category) => (
              <span key={category.id} className="inline-flex items-center gap-1.5 text-[0.6875rem] text-white/50">
                <span
                  className="size-1.5 rounded-full"
                  style={{ backgroundColor: groupColor(category.id) }}
                  aria-hidden
                />
                {category.name}
              </span>
            ))}
          </div>
        </div>
        <p className="mt-2 text-[0.6875rem] leading-relaxed text-muted">
          Node size reflects evidence weight, not proficiency. A node moves only when attributable
          evidence changes.
        </p>
      </div>

      <div>
        {skills.every((skill) => skill.evidenceCount === 0) ? (
          <EmptyState
            title="Proficiency is not yet established."
            body="There is no attributable evidence for any capability yet. RepuH says that plainly instead of inventing a baseline."
            action={
              <Link href="/integrations" className="text-[0.8125rem] font-medium text-primary hover:underline">
                Connect a professional tool
              </Link>
            }
          />
        ) : (
          <div className="space-y-8">
            {categories.map((category) => {
              const group = skills.filter((skill) => skill.categoryId === category.id);
              const withEvidence = group.filter((skill) => skill.evidenceCount > 0);
              if (withEvidence.length === 0 && group.every((skill) => skill.status === "insufficient")) {
                // Keep categories visible only when they carry something; the
                // full ontology lives in the documentation.
                if (group.length === 0) return null;
              }
              return (
                <section key={category.id}>
                  <div className="flex items-baseline justify-between gap-3">
                    <h2 className="flex items-center gap-2 text-[0.9375rem] font-medium">
                      <span
                        className="size-1.5 rounded-full"
                        style={{ backgroundColor: groupColor(category.id) }}
                        aria-hidden
                      />
                      {category.name}
                    </h2>
                    <span className="text-xs text-muted">
                      {withEvidence.filter((skill) => skill.estimate !== null).length} of {group.length} estimated
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted">{category.summary}</p>

                  <ul className="mt-3 divide-y divide-border border-y border-border">
                    {group.map((skill) => (
                      <li key={skill.skillId}>
                        <button
                          type="button"
                          onClick={() => select(skill.skillId)}
                          className={cn(
                            "flex w-full items-center justify-between gap-4 py-2.5 text-left transition-colors hover:bg-surface-muted/60",
                            selectedId === skill.skillId && "bg-surface-muted/60",
                          )}
                        >
                          <span className="min-w-0">
                            <span className="flex items-center gap-2">
                              <span className="truncate text-[0.8125rem] font-medium">{skill.name}</span>
                              {skill.status !== "insufficient" ? (
                                <Badge tone={STATUS_TONE[skill.status]}>{STATUS_LABEL[skill.status]}</Badge>
                              ) : null}
                            </span>
                            <span className="mt-0.5 block text-xs text-muted">
                              {skill.evidenceCount === 0
                                ? "No evidence"
                                : `${skill.evidenceCount} evidence · ${skill.projectCount} project${skill.projectCount === 1 ? "" : "s"}`}
                            </span>
                          </span>
                          <span className="flex shrink-0 items-center gap-3">
                            {skill.estimate !== null ? (
                              <>
                                <span className="hidden sm:block">
                                  <ConfidenceMeter value={skill.confidence} />
                                </span>
                                <span className="num w-7 text-right text-sm font-medium">{skill.estimate}</span>
                              </>
                            ) : (
                              <span className="text-xs text-muted">—</span>
                            )}
                            <ArrowUpRight size={13} className="text-muted" />
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        )}

        <p className="mt-8 border-t border-border pt-4 text-[0.6875rem] leading-relaxed text-muted">
          {evidenceCount} evidence records · algorithm {algorithmVersion} · confidence and
          proficiency are always reported separately.
        </p>
      </div>

      {selected ? (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button
            type="button"
            aria-label="Close capability detail"
            className="absolute inset-0 bg-[#0b1220]/40"
            onClick={() => setSelectedId(null)}
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-labelledby="skill-detail-title"
            className="relative flex h-full w-full max-w-[30rem] flex-col overflow-y-auto border-l border-border bg-surface shadow-[-14px_0_40px_-30px_rgba(6,12,24,0.5)]"
          >
            <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-border bg-surface px-5 py-4">
              <div>
                <p className="label">{selected.categoryName}</p>
                <h2 id="skill-detail-title" className="mt-1 font-display text-2xl leading-tight">
                  {selected.name}
                </h2>
              </div>
              <button
                ref={closeRef}
                type="button"
                onClick={() => setSelectedId(null)}
                aria-label="Close"
                className="grid size-8 place-items-center rounded-sm text-muted hover:bg-surface-muted hover:text-foreground"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-6 px-5 py-5">
              <p className="text-[0.8125rem] leading-relaxed text-muted">{selected.definition}</p>

              <div className="grid grid-cols-3 gap-3 border-y border-border py-4">
                <div>
                  <p className="num text-2xl font-medium">{selected.estimate ?? "—"}</p>
                  <p className="mt-0.5 text-[0.6875rem] text-muted">estimate / 100</p>
                </div>
                <div>
                  <p className="num text-2xl font-medium">{Math.round(selected.confidence * 100)}%</p>
                  <p className="mt-0.5 text-[0.6875rem] text-muted">confidence</p>
                </div>
                <div>
                  <p className="num text-2xl font-medium">{selected.evidenceCount}</p>
                  <p className="mt-0.5 text-[0.6875rem] text-muted">evidence items</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge tone={STATUS_TONE[selected.status]}>{STATUS_LABEL[selected.status]}</Badge>
                  {selected.status === "insufficient" ? (
                    <span className="text-xs text-muted">no estimate is published</span>
                  ) : null}
                </div>
                <ConfidenceMeter value={selected.confidence} />
              </div>

              <section>
                <h3 className="text-[0.8125rem] font-medium">Why this number</h3>
                {loading ? (
                  <p className="mt-2 flex items-center gap-2 text-xs text-muted">
                    <Loader2 size={13} className="animate-spin" /> Loading the computation trace
                  </p>
                ) : error ? (
                  <p className="mt-2 text-xs text-danger">{error}</p>
                ) : detail ? (
                  <ul className="mt-2 space-y-2 text-[0.8125rem] leading-relaxed text-muted">
                    {detail.estimate.rationale.map((line) => (
                      <li key={line} className="flex gap-2">
                        <CircleCheck size={13} className="mt-0.5 shrink-0 text-accent" />
                        {line}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </section>

              {detail && detail.supporting.length > 0 ? (
                <section>
                  <h3 className="text-[0.8125rem] font-medium">Supporting evidence</h3>
                  <ul className="mt-2 divide-y divide-border border-y border-border">
                    {detail.supporting.slice(0, 8).map((item) => (
                      <li key={item.id} className="py-2.5">
                        <p className="text-[0.8125rem] font-medium leading-snug">{item.title}</p>
                        <p className="mt-0.5 text-xs text-muted">
                          {item.projectReference ?? "—"} · {new Date(item.occurredAt).toLocaleDateString("en", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                        <p className="mt-1 text-[0.6875rem] text-muted">
                          weight {item.quality.toFixed(2)} · {item.source} · {item.visibility}
                        </p>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {detail && detail.history.length > 1 ? (
                <section>
                  <h3 className="text-[0.8125rem] font-medium">Historical evolution</h3>
                  <Sparkline history={detail.history} />
                  <p className="mt-1 text-[0.6875rem] text-muted">
                    {detail.history.length} recorded snapshot generations.
                  </p>
                </section>
              ) : null}

              <section>
                <h3 className="flex items-center gap-1.5 text-[0.8125rem] font-medium">
                  <ShieldAlert size={13} className="text-warning" />
                  Known limitations
                </h3>
                <ul className="mt-2 space-y-1.5 text-[0.8125rem] leading-relaxed text-muted">
                  {(detail?.estimate.limitations ?? selected.limitations).map((line) => (
                    <li key={line} className="flex gap-2">
                      <Info size={12} className="mt-1 shrink-0" />
                      {line}
                    </li>
                  ))}
                </ul>
              </section>

              {selected.related.length > 0 ? (
                <section>
                  <h3 className="text-[0.8125rem] font-medium">Related capabilities</h3>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {selected.related.map((relatedId) => {
                      const related = skills.find((skill) => skill.skillId === relatedId);
                      if (!related) return null;
                      return (
                        <button
                          key={relatedId}
                          type="button"
                          onClick={() => setSelectedId(relatedId)}
                          className="rounded-xs border border-border px-2 py-1 text-xs text-muted transition-colors hover:border-border-strong hover:text-foreground"
                        >
                          {related.name}
                        </button>
                      );
                    })}
                  </div>
                </section>
              ) : null}

              <p className="border-t border-border pt-4 text-[0.6875rem] leading-relaxed text-muted">
                Classifications are provisional and AI-assisted where applicable. They are not
                objectively established facts. Algorithm {detail?.estimate.algorithmVersion ?? algorithmVersion}.
              </p>
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}

function Sparkline({ history }: { history: Array<{ estimate: number | null }> }) {
  const values = history.map((point) => point.estimate ?? 0);
  const max = 100;
  const width = 300;
  const height = 56;
  const step = values.length > 1 ? width / (values.length - 1) : width;
  const points = values.map((value, index) => `${index * step},${height - (value / max) * height}`);
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="mt-2 h-14 w-full"
      role="img"
      aria-label={`Estimate history across ${values.length} snapshots`}
    >
      <line x1="0" y1={height} x2={width} y2={height} stroke="var(--border)" strokeWidth="1" />
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke="var(--primary)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {values.map((value, index) => (
        <circle
          key={index}
          cx={index * step}
          cy={height - (value / max) * height}
          r="1.6"
          fill="var(--primary)"
        />
      ))}
    </svg>
  );
}
