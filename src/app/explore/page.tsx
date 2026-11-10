import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import { Chrome } from "@/components/chrome";
import { PageHeader } from "@/components/page-header";
import { Badge, ConfidenceMeter, EmptyState, Input } from "@/components/ui";
import { publicProfiles, searchPublicProfiles, topSkillsFor } from "@/lib/db/queries";
import { SKILLS_BY_ID } from "@/lib/ontology";
import { computeFingerprint } from "@/lib/services/ingest";
import type { Profile } from "@/lib/domain/types";

export const metadata: Metadata = { title: "Explore the network" };
export const dynamic = "force-dynamic";

function summaryFor(profile: Profile) {
  const { fingerprint } = computeFingerprint(profile.userId);
  const top = fingerprint.skills
    .filter((skill) => skill.estimate !== null)
    .sort((a, b) => (b.estimate ?? 0) - (a.estimate ?? 0))
    .slice(0, 3);
  return {
    top,
    established: fingerprint.totals.established,
    evidence: fingerprint.totals.evidenceCount,
    meanConfidence: fingerprint.totals.meanConfidence,
    snapshot: topSkillsFor(profile.userId, 1),
  };
}

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const query = (params.q ?? "").trim().slice(0, 80);
  const profiles = query ? searchPublicProfiles(query, 24) : publicProfiles(24);

  return (
    <Chrome>
      <div className="space-y-8">
        <PageHeader
          title="Explore the network"
          description="Public profiles, read through a scoped projection. Only what each person chose to publish appears here. Private activity, consent records and integration tokens stay out."
          meta={
            <form action="/explore" method="get" className="flex max-w-md gap-2 border-t border-border pt-5">
              <label htmlFor="q" className="sr-only">
                Search public profiles
              </label>
              <div className="relative flex-1">
                <Search
                  size={14}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
                />
                <Input
                  id="q"
                  name="q"
                  defaultValue={query}
                  placeholder="Name, handle, headline or specialization"
                  className="pl-8"
                />
              </div>
              <button
                type="submit"
                className="h-10 shrink-0 rounded-sm border border-border-strong bg-surface px-3 text-xs font-medium hover:border-foreground/40"
              >
                Search
              </button>
            </form>
          }
        />

        {profiles.length === 0 ? (
          <EmptyState
            title={query ? "No public profile matches that search." : "No public profiles yet."}
            body={
              query
                ? "Try a shorter query. Profiles appear here only when their owner has chosen a public visibility."
                : "The network starts empty by design. Create an account, publish a profile, and it will appear here with its evidence."
            }
            action={
              <Link href="/register" className="text-[0.8125rem] font-medium text-primary hover:underline">
                Create your identity
              </Link>
            }
          />
        ) : (
          <ul className="grid gap-0 border-t border-border sm:grid-cols-2">
            {profiles.map((profile) => {
              const summary = summaryFor(profile);
              return (
                <li key={profile.userId} className="border-b border-border py-6 sm:odd:pr-8 sm:even:border-l sm:even:pl-8">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={`/u/${profile.username}`}
                        className="inline-flex flex-wrap items-center gap-2 text-[0.9375rem] font-medium hover:underline"
                      >
                        {profile.displayName}
                        {profile.isDemo ? <Badge tone="warning">DEMO</Badge> : null}
                        {profile.visibility === "selective" ? <Badge>Selective</Badge> : null}
                      </Link>
                      <p className="mt-0.5 text-xs text-muted">@{profile.username}</p>
                      <p className="mt-2 text-[0.8125rem] leading-relaxed text-muted">
                        {profile.headline ?? "No headline"}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        {profile.specialization ?? "Software engineer"}
                        {profile.country ? ` · ${profile.country}` : ""}
                      </p>
                    </div>
                    <span className="num shrink-0 text-right">
                      <span className="block text-2xl font-medium">{summary.evidence}</span>
                      <span className="text-[0.625rem] text-muted">evidence</span>
                    </span>
                  </div>

                  {summary.top.length > 0 ? (
                    <ul className="mt-4 space-y-2">
                      {summary.top.map((skill) => (
                        <li key={skill.skillId} className="flex items-center justify-between gap-3">
                          <span className="truncate text-[0.8125rem]">
                            {SKILLS_BY_ID.get(skill.skillId)?.name ?? skill.skillId}
                          </span>
                          <span className="flex items-center gap-3">
                            <ConfidenceMeter value={skill.confidence} />
                            <span className="num w-6 text-right text-[0.8125rem] font-medium">
                              {skill.estimate}
                            </span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-4 text-xs text-muted">No capability estimate published yet.</p>
                  )}

                  <div className="mt-4 flex items-center justify-between text-[0.6875rem] text-muted">
                    <span>
                      {summary.established} established · {Math.round(summary.meanConfidence * 100)}% mean confidence
                    </span>
                    <Link href={`/u/${profile.username}`} className="font-medium text-primary hover:underline">
                      Open profile
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <p className="text-[0.6875rem] leading-relaxed text-muted">
          Search and listing are served from a public projection. Profiles created by the development
          adapter are labelled DEMO and are excluded from anything presented as live user data.
        </p>
      </div>
    </Chrome>
  );
}
