import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Badge, EmptyState } from "@/components/ui";
import { requireOnboarded } from "@/lib/auth/session";
import { activitySummary, listActivity } from "@/lib/db/queries";
import { SKILLS_BY_ID } from "@/lib/ontology";
import { formatDateTime, relativeTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Activity" };
export const dynamic = "force-dynamic";

const SOURCES = [
  { value: "all", label: "All activity" },
  { value: "github", label: "GitHub" },
  { value: "extension", label: "Browser observation" },
];

const TYPES = [
  { value: "all", label: "Every type" },
  { value: "pull_request_merged", label: "Merged PRs" },
  { value: "code_review_submitted", label: "Reviews" },
  { value: "commit_activity", label: "Commits" },
  { value: "documentation_contributed", label: "Documentation" },
  { value: "issue_resolved", label: "Issues resolved" },
  { value: "release_published", label: "Releases" },
];

const RANGES = [
  { value: "0", label: "All time" },
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
];

const EVENT_LABELS: Record<string, string> = {
  repository_created: "Repository created",
  commit_activity: "Commit activity",
  pull_request_opened: "Pull request opened",
  pull_request_merged: "Pull request merged",
  code_review_submitted: "Code review",
  issue_created: "Issue created",
  issue_resolved: "Issue resolved",
  documentation_contributed: "Documentation",
  release_published: "Release",
  website_session_observed: "Session observed",
};

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ source?: string; type?: string; days?: string }>;
}) {
  const user = await requireOnboarded();
  const params = await searchParams;
  const source = params.source ?? "all";
  const type = params.type ?? "all";
  const days = Number(params.days ?? "0");

  const events = listActivity(user.id, {
    source,
    eventType: type,
    days: Number.isFinite(days) ? days : 0,
    limit: 120,
  });
  const summary = activitySummary(user.id);

  function href(next: { source?: string; type?: string; days?: string }) {
    const query = new URLSearchParams({
      source: next.source ?? source,
      type: next.type ?? type,
      days: next.days ?? String(days),
    });
    return `/activity?${query.toString()}`;
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Activity"
        description="Normalized events, exactly as they were received. Each event keeps its attribution, privacy and processing state — activity is not the same thing as capability."
        meta={
          <dl className="grid grid-cols-2 gap-4 border-t border-border pt-5 text-sm sm:grid-cols-4">
            <div>
              <dt className="label">Total events</dt>
              <dd className="num mt-1">{summary.total}</dd>
            </div>
            <div>
              <dt className="label">Last 30 days</dt>
              <dd className="num mt-1">{summary.last30}</dd>
            </div>
            <div>
              <dt className="label">Projects</dt>
              <dd className="num mt-1">{summary.projects}</dd>
            </div>
            <div>
              <dt className="label">Sources</dt>
              <dd className="num mt-1">{summary.sources}</dd>
            </div>
          </dl>
        }
      />

      <div className="space-y-3">
        <FilterRow ariaLabel="Source" options={SOURCES} active={source} build={(value) => href({ source: value })} />
        <FilterRow ariaLabel="Event type" options={TYPES} active={type} build={(value) => href({ type: value })} />
        <FilterRow ariaLabel="Time range" options={RANGES} active={String(days)} build={(value) => href({ days: value })} />
      </div>

      {events.length === 0 ? (
        <EmptyState
          title="No activity matches these filters."
          body="Try a wider range. If every filter is already at its widest, nothing has been observed for this account yet."
          action={
            <Link href="/integrations" className="text-[0.8125rem] font-medium text-primary hover:underline">
              Check integrations
            </Link>
          }
        />
      ) : (
        <ol className="border-t border-border">
          {events.map((event) => {
            const title = String(event.payload.title ?? EVENT_LABELS[event.eventType] ?? "Activity");
            return (
              <li key={event.id} className="border-b border-border py-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[0.8125rem] font-medium">{title}</span>
                      {event.isDemo ? <Badge tone="warning">DEMO</Badge> : null}
                      <Badge>{EVENT_LABELS[event.eventType] ?? event.eventType}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      {event.projectReference ?? "No project"} · {relativeTime(event.occurredAt)} ·{" "}
                      {formatDateTime(event.occurredAt)}
                    </p>
                    {event.skillCandidates.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {event.skillCandidates.slice(0, 6).map((skillId) => (
                          <span
                            key={skillId}
                            className="rounded-xs bg-surface-muted px-1.5 py-0.5 text-[0.625rem] text-muted"
                          >
                            {SKILLS_BY_ID.get(skillId)?.name ?? skillId}
                          </span>
                        ))}
                        {event.skillCandidates.length > 6 ? (
                          <span className="text-[0.625rem] text-muted">
                            +{event.skillCandidates.length - 6}
                          </span>
                        ) : null}
                      </div>
                    ) : (
                      <p className="mt-2 text-[0.6875rem] text-muted">
                        No reliable skill mapping — retained as activity only.
                      </p>
                    )}
                  </div>

                  <details className="group shrink-0 text-xs">
                    <summary className="cursor-pointer list-none rounded-xs border border-border px-2 py-1 text-muted transition-colors hover:text-foreground">
                      Event record
                    </summary>
                    <dl className="mt-2 w-full min-w-[16rem] space-y-1 border border-border bg-surface p-2.5 font-mono text-[0.625rem] leading-relaxed text-muted">
                      <Row label="event_id" value={event.id} />
                      <Row label="user_id" value={event.userId} />
                      <Row label="source" value={event.source} />
                      <Row label="event_type" value={event.eventType} />
                      <Row label="occurred_at" value={event.occurredAt} />
                      <Row label="received_at" value={event.receivedAt} />
                      <Row label="project" value={event.projectReference ?? "null"} />
                      <Row label="attribution" value={event.attributionStatus} />
                      <Row label="privacy" value={event.privacyStatus} />
                      <Row label="processing" value={event.processingStatus} />
                      <Row label="external_id" value={event.externalId} />
                    </dl>
                  </details>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

function FilterRow({
  ariaLabel,
  options,
  active,
  build,
}: {
  ariaLabel: string;
  options: Array<{ value: string; label: string }>;
  active: string;
  build: (value: string) => string;
}) {
  return (
    <div className="-mx-1 flex items-center gap-1 overflow-x-auto px-1 pb-1">
      <span className="mr-2 shrink-0 text-[0.6875rem] uppercase tracking-[0.08em] text-muted">
        {ariaLabel}
      </span>
      {options.map((option) => {
        const selected = option.value === active;
        return (
          <Link
            key={option.value}
            href={build(option.value)}
            aria-current={selected ? "true" : undefined}
            className={cn(
              "shrink-0 rounded-xs border px-2 py-1 text-xs transition-colors",
              selected
                ? "border-foreground bg-foreground text-background"
                : "border-border text-muted hover:border-border-strong hover:text-foreground",
            )}
          >
            {option.label}
          </Link>
        );
      })}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="w-24 shrink-0 text-muted/70">{label}</dt>
      <dd className="break-all">{value}</dd>
    </div>
  );
}
