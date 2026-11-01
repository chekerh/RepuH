import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Badge, EmptyState } from "@/components/ui";
import { EvidenceActions } from "@/components/evidence/actions";
import { requireOnboarded } from "@/lib/auth/session";
import { countEvidence, listEvidence } from "@/lib/db/queries";
import { SKILLS_BY_ID, SIGNALS } from "@/lib/ontology";
import { cn, formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Evidence" };
export const dynamic = "force-dynamic";

const FILTERS = [
  { value: "all", label: "All" },
  { value: "private", label: "Private" },
  { value: "selective", label: "Selective" },
  { value: "public", label: "Public" },
];

export default async function EvidencePage({
  searchParams,
}: {
  searchParams: Promise<{ visibility?: string }>;
}) {
  const user = await requireOnboarded();
  const params = await searchParams;
  const visibility = params.visibility ?? "all";
  const evidence = listEvidence(user.id, { visibility, limit: 100 });
  const total = countEvidence(user.id);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Evidence"
        description="The attributable artifacts behind every capability estimate. Each record states what it supports, why it was mapped, and where it stops being reliable."
        meta={
          <div className="flex flex-wrap items-center gap-2 border-t border-border pt-5">
            {FILTERS.map((filter) => {
              const active = filter.value === visibility;
              return (
                <Link
                  key={filter.value}
                  href={filter.value === "all" ? "/evidence" : `/evidence?visibility=${filter.value}`}
                  aria-current={active ? "true" : undefined}
                  className={cn(
                    "rounded-xs border px-2.5 py-1 text-xs transition-colors",
                    active
                      ? "border-foreground bg-foreground text-background"
                      : "border-border text-muted hover:border-border-strong hover:text-foreground",
                  )}
                >
                  {filter.label}
                </Link>
              );
            })}
            <span className="ml-auto text-xs text-muted">{total} total records</span>
          </div>
        }
      />

      {evidence.length === 0 ? (
        <EmptyState
          title="No evidence records yet."
          body="Evidence appears only when an attributable event has been classified against the ontology. If you have not connected anything, this state is accurate rather than broken."
          action={
            <Link href="/integrations" className="text-[0.8125rem] font-medium text-primary hover:underline">
              Open integrations
            </Link>
          }
        />
      ) : (
        <ul className="space-y-0 border-t border-border">
          {evidence.map((item) => {
            const signal = SIGNALS[item.signal];
            return (
              <li key={item.id} className="border-b border-border py-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-[0.9375rem] font-medium leading-snug">{item.title}</h2>
                      {item.isDemo ? <Badge tone="warning">DEMO</Badge> : null}
                      {item.verificationState === "disputed" ? (
                        <Badge tone="danger">Disputed</Badge>
                      ) : (
                        <Badge tone="warning">Provisional</Badge>
                      )}
                      <Badge tone={item.visibility === "public" ? "accent" : "neutral"}>
                        {item.visibility}
                      </Badge>
                    </div>

                    <p className="mt-1 text-xs text-muted">
                      {item.projectReference ?? "No project"} · {signal?.label ?? item.signal} ·{" "}
                      {formatDateTime(item.occurredAt)} · quality {item.quality.toFixed(2)}
                    </p>

                    <p className="mt-2 text-[0.8125rem] leading-relaxed text-muted">{item.summary}</p>

                    <div className="mt-2 flex flex-wrap gap-1">
                      {item.skillIds.map((skillId) => (
                        <Link
                          key={skillId}
                          href={`/fingerprint?skill=${skillId}`}
                          className="rounded-xs bg-surface-muted px-1.5 py-0.5 text-[0.6875rem] text-muted hover:text-foreground"
                        >
                          {SKILLS_BY_ID.get(skillId)?.name ?? skillId}
                        </Link>
                      ))}
                      {item.skillIds.length === 0 ? (
                        <span className="text-[0.6875rem] text-muted">
                          No reliable skill mapping — retained as activity.
                        </span>
                      ) : null}
                    </div>

                    <details className="mt-3 group">
                      <summary className="cursor-pointer list-none text-[0.6875rem] text-muted hover:text-foreground">
                        Why this counted, and where it stops
                      </summary>
                      <div className="mt-2 border-l border-border pl-3">
                        <p className="label">Mapping rules</p>
                        <ul className="mt-1 space-y-1 text-[0.6875rem] leading-relaxed text-muted">
                          {item.reasons.length === 0 ? (
                            <li>No per-skill rule was recorded for this item.</li>
                          ) : (
                            item.reasons.map((reason, index) => (
                              <li key={`${reason.skillId}-${index}`}>
                                <span className="text-foreground/80">
                                  {SKILLS_BY_ID.get(reason.skillId)?.name ?? reason.skillId}
                                </span>
                                {" — "}
                                {reason.rule}
                              </li>
                            ))
                          )}
                        </ul>
                        <p className="label mt-3">Limitations</p>
                        <ul className="mt-1 space-y-1 text-[0.6875rem] leading-relaxed text-muted">
                          {item.limitations.length === 0 ? (
                            <li>No additional limitation recorded.</li>
                          ) : (
                            item.limitations.map((limitation) => (
                              <li key={limitation}>{limitation}</li>
                            ))
                          )}
                        </ul>
                        <p className="mt-3 font-mono text-[0.625rem] text-muted">
                          content hash {item.contentHash.slice(0, 24)}…
                        </p>
                      </div>
                    </details>
                  </div>

                  <div className="shrink-0 lg:w-[15rem]">
                    <EvidenceActions
                      evidenceId={item.id}
                      visibility={item.visibility}
                      verificationState={item.verificationState}
                    />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <p className="text-[0.6875rem] leading-relaxed text-muted">
        Evidence is immutable by design. A correction marks the record disputed and removes it from
        public projections rather than deleting history.
      </p>
    </div>
  );
}
