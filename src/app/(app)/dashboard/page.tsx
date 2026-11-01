import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowUpRight,
  CircleCheck,
  GitBranch,
  Info,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { CapabilityLattice } from "@/components/lattice";
import { Badge, ButtonLink, ConfidenceMeter, EmptyState } from "@/components/ui";
import { PageHeader } from "@/components/page-header";
import { requireOnboarded } from "@/lib/auth/session";
import {
  activitySummary,
  getIntegration,
  latestSnapshotAt,
  listActivity,
  listEvidence,
  topSkillsFor,
} from "@/lib/db/queries";
import { computeFingerprint } from "@/lib/services/ingest";
import { SKILLS, SKILLS_BY_ID } from "@/lib/ontology";
import { formatDateTime, relativeTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Overview" };
export const dynamic = "force-dynamic";

const EVENT_LABELS: Record<string, string> = {
  repository_created: "Repository",
  commit_activity: "Commits",
  pull_request_opened: "Pull request",
  pull_request_merged: "Merged",
  code_review_submitted: "Review",
  issue_created: "Issue",
  issue_resolved: "Resolved",
  documentation_contributed: "Documentation",
  release_published: "Release",
  website_session_observed: "Observation",
};

export default async function DashboardPage() {
  const user = await requireOnboarded();
  const integration = getIntegration(user.id, "github");
  const { fingerprint, evidence } = computeFingerprint(user.id);
  const activity = listActivity(user.id, { limit: 6 });
  const summary = activitySummary(user.id);
  const top = topSkillsFor(user.id, 5);
  const snapshotAt = latestSnapshotAt(user.id);
  const demo = integration?.status === "demo";
  const hasEvidence = evidence.length > 0;

  const nodes = fingerprint.skills
    .filter((skill) => skill.evidenceCount > 0)
    .map((skill) => {
      const meta = SKILLS_BY_ID.get(skill.skillId);
      const maxEvidence = Math.max(
        ...fingerprint.skills.map((item) => item.evidenceCount),
        1,
      );
      return {
        id: skill.skillId,
        label: meta?.name ?? skill.skillId,
        group: meta?.categoryId ?? "other",
        weight: 0.25 + (skill.evidenceCount / maxEvidence) * 0.75,
        confidence: skill.confidence,
        score: skill.estimate,
      };
    });

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const firstName = user.profile.displayName.split(" ")[0] ?? user.profile.displayName;

  return (
    <div className="space-y-8">
      <PageHeader
        title={`${greeting}, ${firstName}`}
        description={
          hasEvidence
            ? "This is what your work currently supports. Every figure below is recomputed from attributable evidence, not accumulated activity."
            : "Your professional fingerprint begins with your work. Nothing has been observed yet — that is the honest state, not an error."
        }
        actions={
          <>
            <ButtonLink href="/fingerprint" variant="secondary" size="sm">
              Open fingerprint
            </ButtonLink>
            {!integration ? (
              <ButtonLink href="/integrations" size="sm">
                <GitBranch size={14} />
                Connect GitHub
              </ButtonLink>
            ) : (
              <ButtonLink href="/integrations" size="sm" variant="secondary">
                Manage integration
              </ButtonLink>
            )}
          </>
        }
        meta={
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted">
            <span className="inline-flex items-center gap-1.5">
              <span
                className={`size-1.5 rounded-full ${demo ? "bg-warning" : hasEvidence ? "bg-success" : "bg-muted"}`}
                aria-hidden
              />
              {demo ? "Development adapter" : integration ? "Observation active" : "Not observing"}
            </span>
            <span>Last synchronization: {relativeTime(integration?.lastSyncedAt)}</span>
            <span>Snapshot: {snapshotAt ? formatDateTime(snapshotAt) : "none yet"}</span>
            <Link href="/settings#observation" className="underline underline-offset-2 hover:text-foreground">
              Consent controls
            </Link>
          </div>
        }
      />

      {!hasEvidence ? (
        <EmptyState
          title="Your professional fingerprint begins with your work."
          body="Connect a professional tool to create evidence from activity you already performed. If you want to see how the product behaves first, the development adapter can populate clearly labelled demo data."
          action={
            <div className="flex flex-wrap gap-2">
              <ButtonLink href="/integrations" size="sm">
                <GitBranch size={14} />
                Connect GitHub
              </ButtonLink>
              <ButtonLink href="/integrations#demo" size="sm" variant="secondary">
                Explore with demo data
              </ButtonLink>
            </div>
          }
        />
      ) : null}

      <section aria-label="Capability summary" className="grid grid-cols-2 gap-y-6 border-y border-border py-6 sm:grid-cols-4">
        <div className="pr-4">
          <p className="num text-3xl font-medium tracking-tight">{fingerprint.totals.established}</p>
          <p className="mt-1 text-[0.8125rem]">Established</p>
          <p className="mt-0.5 text-xs text-muted">confidence ≥ 62% and independent corroboration</p>
        </div>
        <div className="border-l border-border pl-4 sm:pl-6">
          <p className="num text-3xl font-medium tracking-tight">{fingerprint.totals.provisional}</p>
          <p className="mt-1 text-[0.8125rem]">Provisional</p>
          <p className="mt-0.5 text-xs text-muted">estimate available, corroboration incomplete</p>
        </div>
        <div className="border-t border-border pt-4 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
          <p className="num text-3xl font-medium tracking-tight">{evidence.length}</p>
          <p className="mt-1 text-[0.8125rem]">Evidence records</p>
          <p className="mt-0.5 text-xs text-muted">across {fingerprint.totals.projectCount} projects</p>
        </div>
        <div className="border-l border-border pl-4 sm:pl-6">
          <p className="num text-3xl font-medium tracking-tight">
            {Math.round(fingerprint.totals.meanConfidence * 100)}%
          </p>
          <p className="mt-1 text-[0.8125rem]">Mean confidence</p>
          <p className="mt-0.5 text-xs text-muted">separate from proficiency</p>
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-[1.35fr_1fr]">
        <div className="space-y-8">
          <section>
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="text-[0.9375rem] font-medium">Capability lattice</h2>
              <Link
                href="/fingerprint"
                className="inline-flex items-center gap-1 text-xs text-muted hover:text-foreground"
              >
                Full fingerprint <ArrowUpRight size={12} />
              </Link>
            </div>
            <div className="mt-3 overflow-hidden rounded-md border border-border bg-[#0b1220]">
              <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
                <span className="label text-white/40">Evidence-weighted</span>
                <span className="label text-white/25">{user.profile.specialization ?? "Software engineering"}</span>
              </div>
              <div className="h-[19rem] px-1 pt-1">
                <CapabilityLattice nodes={nodes} caption="Drag to rotate" interactive={false} />
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-[0.9375rem] font-medium">Strongest signals</h2>
            <p className="mt-1 text-xs text-muted">
              Ranked by estimate, then confidence. Not a single overall score.
            </p>
            <ul className="mt-3 divide-y divide-border border-y border-border">
              {top.length === 0 ? (
                <li className="py-6 text-sm text-muted">No capability estimate is available yet.</li>
              ) : (
                top.map((skill) => {
                  const meta = SKILLS_BY_ID.get(skill.skill_id);
                  return (
                    <li key={skill.skill_id} className="flex items-center justify-between gap-4 py-3">
                      <div className="min-w-0">
                        <Link
                          href={`/fingerprint?skill=${skill.skill_id}`}
                          className="truncate text-[0.8125rem] font-medium hover:underline"
                        >
                          {meta?.name ?? skill.skill_id}
                        </Link>
                        <p className="mt-0.5 text-xs text-muted">
                          {skill.evidence_count} evidence · {meta?.categoryId ?? "—"}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <ConfidenceMeter value={skill.confidence} />
                        <span className="num w-8 text-right text-sm font-medium">{skill.estimate}</span>
                      </div>
                    </li>
                  );
                })
              )}
            </ul>
          </section>
        </div>

        <div className="space-y-8">
          <section>
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="text-[0.9375rem] font-medium">Recent meaningful activity</h2>
              <Link href="/activity" className="text-xs text-muted hover:text-foreground">
                All activity
              </Link>
            </div>
            <ul className="mt-3 divide-y divide-border border-y border-border">
              {activity.length === 0 ? (
                <li className="py-6 text-sm text-muted">
                  Nothing has been observed. Connect an integration to begin.
                </li>
              ) : (
                activity.map((event) => (
                  <li key={event.id} className="py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[0.8125rem] font-medium">
                          {String(event.payload.title ?? EVENT_LABELS[event.eventType] ?? "Activity")}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-muted">
                          {event.projectReference ?? "—"} · {relativeTime(event.occurredAt)}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        {event.isDemo ? <Badge tone="warning">DEMO</Badge> : null}
                        <Badge>{EVENT_LABELS[event.eventType] ?? event.eventType}</Badge>
                      </div>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </section>

          <section>
            <h2 className="text-[0.9375rem] font-medium">What the data suggests</h2>
            <p className="mt-1 text-xs text-muted">
              Generated from your evidence only. These are observations, not recommendations.
            </p>
            <ul className="mt-3 space-y-3">
              {[
                summary.byType[0]
                  ? {
                      icon: Sparkles,
                      text: `Most of your recorded activity is ${String(summary.byType[0].type).replace(/_/g, " ")} (${summary.byType[0].count} events).`,
                    }
                  : null,
                fingerprint.totals.skillsWithEvidence > 0
                  ? {
                      icon: CircleCheck,
                      text: `${fingerprint.totals.skillsWithEvidence} of ${SKILLS.length} capabilities have at least one attributable item; ${SKILLS.length - fingerprint.totals.skillsWithEvidence} remain unestablished.`,
                    }
                  : null,
                evidence.some((item) => item.skillIds.length === 0)
                  ? {
                      icon: Info,
                      text: `${evidence.filter((item) => item.skillIds.length === 0).length} evidence item(s) could not be mapped to a skill and are retained as activity only.`,
                    }
                  : null,
                fingerprint.totals.projectCount <= 1 && evidence.length > 0
                  ? {
                      icon: ShieldCheck,
                      text: "All evidence currently comes from one project, so confidence is capped accordingly.",
                    }
                  : null,
              ]
                .filter((item): item is { icon: typeof Sparkles; text: string } => item !== null)
                .map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.text} className="flex gap-2.5 text-[0.8125rem] leading-relaxed text-muted">
                      <Icon size={14} className="mt-0.5 shrink-0 text-primary" />
                      {item.text}
                    </li>
                  );
                })}
              {evidence.length === 0 ? (
                <li className="text-[0.8125rem] text-muted">
                  No insight can be derived until evidence exists.
                </li>
              ) : null}
            </ul>
          </section>

          <section className="border-t border-border pt-5">
            <h2 className="text-[0.9375rem] font-medium">Integrity</h2>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              Evidence hashes are batched into a Merkle root. Anchoring proves the record was not
              altered — never that a skill is real.
            </p>
            <Link
              href="/settings#integrity"
              className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              Open integrity controls
              <ArrowUpRight size={12} />
            </Link>
          </section>
        </div>
      </div>
    </div>
  );
}
