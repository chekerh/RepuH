import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, EyeOff, ShieldCheck } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { PublicFooter } from "@/components/chrome";
import { Badge, ConfidenceMeter, EmptyState } from "@/components/ui";
import { currentUser } from "@/lib/auth/session";
import {
  getProfileByUsername,
  listAnchors,
  listPublicCertificates,
  publicEvidenceFor,
  topSkillsFor,
} from "@/lib/db/queries";
import { parseCertificatePayload } from "@/lib/certificates/sign";
import { computeFingerprint } from "@/lib/services/ingest";
import { CATEGORIES, CATEGORY_BY_ID, SIGNALS, SKILLS_BY_ID } from "@/lib/ontology";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const profile = getProfileByUsername(username);
  if (!profile) return { title: "Profile not found" };
  if (profile.visibility === "private") return { title: "Private profile" };
  return {
    title: `${profile.displayName} (@${profile.username})`,
    description: profile.headline ?? "An evidence-backed professional profile on RepuH.",
  };
}

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const profile = getProfileByUsername(username);
  if (!profile) notFound();

  const viewer = await currentUser();
  const isOwner = viewer?.id === profile.userId;

  if (profile.visibility === "private" && !isOwner) {
    return (
      <div className="min-h-dvh">
        <SiteHeader signedIn={Boolean(viewer)} />
        <main id="main" className="mx-auto flex min-h-[60vh] w-full max-w-[46rem] flex-col justify-center px-4 py-20 sm:px-6">
          <EyeOff size={20} className="text-muted" />
          <h1 className="display mt-4 text-4xl">This profile is private.</h1>
          <p className="mt-3 max-w-[52ch] text-sm leading-relaxed text-muted">
            The owner has chosen not to publish a projection. Private profiles do not resolve at a
            public address, and their activity, evidence and consent records are never exposed by
            this route.
          </p>
          <div className="mt-6 flex gap-4 text-sm">
            <Link href="/explore" className="font-medium text-primary hover:underline">
              Explore public profiles
            </Link>
            <Link href="/" className="text-muted hover:text-foreground">
              Return home
            </Link>
          </div>
        </main>
        <PublicFooter />
      </div>
    );
  }

  const { fingerprint } = computeFingerprint(profile.userId);
  const evidence = publicEvidenceFor(profile.userId);
  const anchors = listAnchors(profile.userId);
  const certificates = listPublicCertificates(profile.userId).map((certificate) => {
    const payload = parseCertificatePayload(certificate.payload);
    return {
      id: certificate.id,
      skillName: payload?.claim.skillName ?? certificate.skillId,
      estimate: payload?.claim.estimate ?? null,
      anchorStatus: certificate.anchorStatus,
      anchorSequence: certificate.anchorSequence,
      registryContractId: certificate.registryContractId,
    };
  });
  const top = topSkillsFor(profile.userId, 6);

  const grouped = CATEGORIES.map((category) => ({
    category,
    skills: fingerprint.skills.filter(
      (skill) =>
        SKILLS_BY_ID.get(skill.skillId)?.categoryId === category.id && skill.estimate !== null,
    ),
  })).filter((group) => group.skills.length > 0);

  const corroborated = evidence.filter((item) => item.verificationState === "corroborated").length;

  return (
    <div className="min-h-dvh">
      <SiteHeader signedIn={Boolean(viewer)} />

      <main id="main" className="mx-auto w-full max-w-[72rem] px-4 pb-16 pt-10 sm:px-6 lg:px-8">
        <header className="border-b border-border pb-8">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-start">
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="display text-[clamp(2.2rem,5vw,3.3rem)]">{profile.displayName}</h1>
                {profile.isDemo ? <Badge tone="warning">DEMO PROFILE</Badge> : null}
                {profile.visibility === "selective" ? <Badge>Selective</Badge> : null}
              </div>
              <p className="mt-1 text-sm text-muted">
                @{profile.username} · {profile.specialization ?? "Software engineer"}
                {profile.country ? ` · ${profile.country}` : ""}
              </p>
              <p className="mt-3 max-w-[58ch] text-[0.9375rem] leading-relaxed text-muted">
                {profile.headline ?? "No professional headline."}
              </p>
              <p className="mt-3 text-sm">
                <Link
                  href={`/api/profile/public/${profile.username}/persona`}
                  className="font-medium text-primary hover:underline"
                >
                  Download persona.md
                </Link>
              </p>
              {profile.bio ? (
                <p className="mt-3 max-w-[62ch] text-[0.8125rem] leading-relaxed text-muted">{profile.bio}</p>
              ) : null}
            </div>

            <dl className="grid shrink-0 grid-cols-2 gap-x-6 gap-y-3 text-[0.8125rem] sm:text-right">
              <div>
                <dt className="label">RepuH ID</dt>
                <dd className="num mt-0.5 font-mono text-xs">{profile.publicId}</dd>
              </div>
              <div>
                <dt className="label">Updated</dt>
                <dd className="mt-0.5">{formatDate(profile.updatedAt)}</dd>
              </div>
              <div>
                <dt className="label">Evidence</dt>
                <dd className="num mt-0.5">{fingerprint.totals.evidenceCount}</dd>
              </div>
              <div>
                <dt className="label">Corroborated</dt>
                <dd className="num mt-0.5">{corroborated}</dd>
              </div>
            </dl>
          </div>
        </header>

        <div className="grid gap-10 py-8 lg:grid-cols-[1.5fr_1fr]">
          <div className="space-y-8">
            <section>
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-[0.9375rem] font-medium">Capability fingerprint</h2>
                <span className="text-xs text-muted">
                  {fingerprint.totals.established} established · {fingerprint.totals.provisional} provisional
                </span>
              </div>

              {grouped.length === 0 ? (
                <EmptyState
                  className="mt-3"
                  title="Proficiency is not yet established."
                  body="This profile has no attributable evidence for any capability. RepuH leaves the fingerprint empty rather than inventing a baseline."
                />
              ) : (
                <div className="mt-3 space-y-6">
                  {grouped.map((group) => (
                    <div key={group.category.id}>
                      <h3 className="flex items-center gap-2 text-[0.8125rem] font-medium">
                        <span className="size-1.5 rounded-full bg-primary" aria-hidden />
                        {group.category.name}
                      </h3>
                      <ul className="mt-2 divide-y divide-border border-y border-border">
                        {group.skills.map((skill) => {
                          const meta = SKILLS_BY_ID.get(skill.skillId);
                          return (
                            <li key={skill.skillId} className="flex items-center justify-between gap-4 py-2.5">
                              <div className="min-w-0">
                                <p className="truncate text-[0.8125rem] font-medium">{meta?.name}</p>
                                <p className="text-[0.6875rem] text-muted">
                                  {skill.evidenceCount} evidence · {skill.projectCount} project
                                  {skill.projectCount === 1 ? "" : "s"} ·{" "}
                                  {skill.status === "established" ? "established" : "provisional"}
                                </p>
                              </div>
                              <div className="flex shrink-0 items-center gap-3">
                                <ConfidenceMeter value={skill.confidence} />
                                <span className="num w-7 text-right text-sm font-medium">{skill.estimate}</span>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section>
              <h2 className="text-[0.9375rem] font-medium">Published evidence</h2>
              <p className="mt-1 text-xs text-muted">
                Only items the owner marked public or selective. Private records are excluded by the
                query.
              </p>
              {evidence.length === 0 ? (
                <p className="mt-3 border-y border-border py-4 text-[0.8125rem] text-muted">
                  No evidence has been published.
                </p>
              ) : (
                <ul className="mt-3 divide-y divide-border border-y border-border">
                  {evidence.slice(0, 12).map((item) => (
                    <li key={item.id} className="py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[0.8125rem] font-medium">{item.title}</p>
                        {item.isDemo ? <Badge tone="warning">DEMO</Badge> : null}
                        <Badge tone={item.verificationState === "corroborated" ? "success" : "neutral"}>
                          {item.verificationState}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted">
                        {item.projectReference ?? "—"} · {SIGNALS[item.signal]?.label ?? item.signal} ·{" "}
                        {formatDate(item.occurredAt)}
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {item.skillIds.map((skillId) => (
                          <span
                            key={skillId}
                            className="rounded-xs bg-surface-muted px-1.5 py-0.5 text-[0.625rem] text-muted"
                          >
                            {SKILLS_BY_ID.get(skillId)?.name ?? skillId}
                          </span>
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <aside className="space-y-8">
            <section className="border border-border bg-surface p-4">
              <h2 className="flex items-center gap-2 text-[0.8125rem] font-medium">
                <ShieldCheck size={14} className="text-accent" />
                Verification language
              </h2>
              <dl className="mt-3 space-y-3 text-[0.75rem] leading-relaxed">
                {[
                  {
                    term: "Observed activity",
                    detail: "An event was recorded from a connected source. It is not a capability claim.",
                  },
                  {
                    term: "Evidence-backed capability",
                    detail: "An estimate derived from classified evidence, with confidence reported separately.",
                  },
                  {
                    term: "Independent corroboration",
                    detail: "The same capability is supported by more than one source or project.",
                  },
                  {
                    term: "Blockchain anchor",
                    detail: "Proves the integrity of a commitment. Never proof of skill or identity.",
                  },
                ].map((item) => (
                  <div key={item.term}>
                    <dt className="font-medium text-foreground">{item.term}</dt>
                    <dd className="mt-0.5 text-muted">{item.detail}</dd>
                  </div>
                ))}
              </dl>
            </section>

            {top.length > 0 ? (
              <section>
                <h2 className="text-[0.9375rem] font-medium">Highest estimates</h2>
                <ul className="mt-2 space-y-2">
                  {top.map((skill) => (
                    <li key={skill.skill_id} className="flex items-center justify-between gap-3 text-[0.8125rem]">
                      <span className="truncate">
                        {SKILLS_BY_ID.get(skill.skill_id)?.name ?? skill.skill_id}
                      </span>
                      <span className="num font-medium">{skill.estimate}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-[0.6875rem] text-muted">
                  Ordered per capability. There is no combined score on this profile.
                </p>
              </section>
            ) : null}

            {certificates.length > 0 ? (
              <section>
                <h2 className="text-[0.9375rem] font-medium">Certificates</h2>
                <ul className="mt-2 divide-y divide-border border-y border-border">
                  {certificates.map((certificate) => (
                    <li key={certificate.id} className="py-2">
                      <Link
                        href={`/certificate/${certificate.id}`}
                        className="flex items-center justify-between gap-3 text-[0.8125rem] hover:text-primary"
                      >
                        <span className="truncate">{certificate.skillName}</span>
                        <span className="flex shrink-0 items-center gap-2">
                          {certificate.estimate !== null ? (
                            <span className="num text-muted">{certificate.estimate}</span>
                          ) : null}
                          <Badge
                            tone={
                              certificate.registryContractId || certificate.anchorStatus === "confirmed" ? "success" : "neutral"
                            }
                          >
                            {certificate.registryContractId
                              ? "Contract registered"
                              : certificate.anchorStatus === "confirmed"
                              ? `Hedera #${certificate.anchorSequence}`
                              : "signed"}
                          </Badge>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-[0.6875rem] leading-relaxed text-muted">
                  Signed records of a capability at a point in time. Each certificate carries its
                  own confidence and limitations.
                </p>
              </section>
            ) : null}

            <section>
              <h2 className="text-[0.9375rem] font-medium">Integrity</h2>
              <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-muted">
                {anchors.length === 0
                  ? "No evidence batch has been anchored."
                  : `${anchors.length} batch${anchors.length === 1 ? "" : "es"} anchored, covering ${anchors.reduce((total, anchor) => total + anchor.leafCount, 0)} commitments.`}
              </p>
              <p className="mt-2 text-[0.6875rem] leading-relaxed text-muted">
                Anchoring proves a record has not changed. It does not prove a claim, an employment
                history or a proficiency.
              </p>
            </section>

            {isOwner ? (
              <section className="border-t border-border pt-4">
                <p className="text-xs text-muted">This is your profile.</p>
                <div className="mt-2 flex flex-wrap gap-3 text-xs">
                  <Link href="/settings#profile" className="font-medium text-primary hover:underline">
                    Edit profile
                  </Link>
                  <Link href="/fingerprint" className="text-muted hover:text-foreground">
                    Open fingerprint
                  </Link>
                </div>
              </section>
            ) : null}

            <section className="border-t border-border pt-4">
              <p className="text-xs text-muted">
                Read how estimates are computed and where they stop being reliable.
              </p>
              <Link
                href="/docs#scoring"
                className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                Scoring method <ArrowUpRight size={12} />
              </Link>
            </section>
          </aside>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
