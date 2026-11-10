import type { Metadata } from "next";
import Link from "next/link";
import { Chrome } from "@/components/chrome";
import { PageHeader } from "@/components/page-header";
import { Badge, ConfidenceMeter, EmptyState } from "@/components/ui";
import { leaderboard, type LeaderboardEntry } from "@/lib/db/queries";
import { SKILLS, SKILLS_BY_ID } from "@/lib/ontology";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Leaderboards" };
export const dynamic = "force-dynamic";

export default async function LeaderboardsPage({
  searchParams,
}: {
  searchParams: Promise<{ skill?: string }>;
}) {
  const params = await searchParams;
  const ranked = SKILLS.map((skill) => ({
    skill,
    entries: leaderboard(skill.id, 25),
  })).filter((group) => group.entries.length > 0);

  const activeSkillId =
    params.skill && SKILLS_BY_ID.has(params.skill)
      ? params.skill
      : (ranked[0]?.skill.id ?? "typescript");
  const active = ranked.find((group) => group.skill.id === activeSkillId);
  const entries: LeaderboardEntry[] = active?.entries ?? [];

  return (
    <Chrome>
      <div className="space-y-8">
        <PageHeader
          title="Leaderboards"
          description="Ranks are per capability, published only where independently supported evidence exists. Followers, account age, time online, payments and endorsements are not inputs."
          meta={
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-border pt-5 text-xs text-muted">
              <span>Eligibility: public profile, leaderboard opt-in, at least two evidence items.</span>
              <span>No rank is issued where evidence is insufficient.</span>
            </div>
          }
        />

        <div className="-mx-1 flex items-center gap-1 overflow-x-auto px-1 pb-1">
          {(ranked.length > 0 ? ranked.map((group) => group.skill) : SKILLS.slice(0, 8)).map((skill) => {
            const selected = skill.id === activeSkillId;
            const count = ranked.find((group) => group.skill.id === skill.id)?.entries.length;
            return (
              <Link
                key={skill.id}
                href={`/leaderboards?skill=${skill.id}`}
                aria-current={selected ? "true" : undefined}
                className={cn(
                  "shrink-0 rounded-xs border px-2.5 py-1 text-xs transition-colors",
                  selected
                    ? "border-foreground bg-foreground text-background"
                    : "border-border text-muted hover:border-border-strong hover:text-foreground",
                )}
              >
                {skill.name}
                {count ? <span className="ml-1.5 opacity-60">{count}</span> : null}
              </Link>
            );
          })}
        </div>

        <section>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-display text-2xl leading-tight">
              {SKILLS_BY_ID.get(activeSkillId)?.name ?? activeSkillId}
            </h2>
            <p className="max-w-[52ch] text-xs text-muted">
              {SKILLS_BY_ID.get(activeSkillId)?.definition}
            </p>
          </div>

          {entries.length === 0 ? (
            <EmptyState
              className="mt-4"
              title="Your professional network is growing."
              body="Rankings will appear as independently supported skill evidence becomes available. A rank is never issued from activity volume alone."
              action={
                <Link href="/explore" className="text-[0.8125rem] font-medium text-primary hover:underline">
                  Explore public profiles
                </Link>
              }
            />
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[44rem] border-collapse text-left text-sm">
                <caption className="sr-only">
                  Ranked evidence-backed estimates for {SKILLS_BY_ID.get(activeSkillId)?.name}
                </caption>
                <thead>
                  <tr className="border-y border-border">
                    <th scope="col" className="w-12 py-2 pr-3 text-xs font-medium text-muted">Rank</th>
                    <th scope="col" className="py-2 pr-3 text-xs font-medium text-muted">Professional</th>
                    <th scope="col" className="py-2 pr-3 text-xs font-medium text-muted">Specialization</th>
                    <th scope="col" className="py-2 pr-3 text-right text-xs font-medium text-muted">Estimate</th>
                    <th scope="col" className="py-2 pr-3 text-xs font-medium text-muted">Confidence</th>
                    <th scope="col" className="py-2 text-right text-xs font-medium text-muted">Evidence</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry, index) => (
                    <tr key={`${entry.userId}-${entry.skillId}`} className="border-b border-border">
                      <td className="num py-3 pr-3 text-muted">{String(index + 1).padStart(2, "0")}</td>
                      <td className="py-3 pr-3">
                        <Link href={`/u/${entry.username}`} className="group inline-flex items-center gap-2">
                          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary-soft text-[0.625rem] font-semibold text-primary">
                            {entry.displayName.slice(0, 2).toUpperCase()}
                          </span>
                          <span>
                            <span className="flex items-center gap-1.5 text-[0.8125rem] font-medium group-hover:underline">
                              {entry.displayName}
                              {entry.isDemo ? <Badge tone="warning">DEMO</Badge> : null}
                            </span>
                            <span className="block text-[0.6875rem] text-muted">@{entry.username}</span>
                          </span>
                        </Link>
                      </td>
                      <td className="py-3 pr-3 text-[0.8125rem] text-muted">
                        {entry.specialization ?? "—"}
                      </td>
                      <td className="num py-3 pr-3 text-right text-sm font-medium">{entry.estimate}</td>
                      <td className="py-3 pr-3">
                        <ConfidenceMeter value={entry.confidence} />
                      </td>
                      <td className="num py-3 text-right text-[0.8125rem] text-muted">
                        {entry.evidenceCount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <p className="border-t border-border pt-4 text-[0.6875rem] leading-relaxed text-muted">
          Estimates are per capability and are not comparable across skills. A rank orders
          evidence-backed estimates for one capability in one period; it is not a judgement of a
          person. Demo profiles are labelled and never counted as live users.
        </p>
      </div>
    </Chrome>
  );
}
