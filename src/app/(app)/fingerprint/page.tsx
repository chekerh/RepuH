import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Eye, EyeOff, Fingerprint as FingerprintIcon } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Badge, ButtonLink } from "@/components/ui";
import { FingerprintExplorer, type SkillView } from "@/components/fingerprint/explorer";
import { requireOnboarded } from "@/lib/auth/session";
import { computeFingerprint } from "@/lib/services/ingest";
import { CATEGORIES, CATEGORY_BY_ID, SKILLS, SKILLS_BY_ID } from "@/lib/ontology";
import { getIntegration, latestSnapshotAt } from "@/lib/db/queries";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "My Fingerprint" };
export const dynamic = "force-dynamic";

export default async function FingerprintPage({
  searchParams,
}: {
  searchParams: Promise<{ skill?: string }>;
}) {
  const user = await requireOnboarded();
  const { skill } = await searchParams;
  const { fingerprint, evidence } = computeFingerprint(user.id);
  const integration = getIntegration(user.id, "github");
  const snapshotAt = latestSnapshotAt(user.id);

  const skills: SkillView[] = fingerprint.skills.map((estimate) => {
    const meta = SKILLS_BY_ID.get(estimate.skillId);
    return {
      skillId: estimate.skillId,
      name: meta?.name ?? estimate.skillId,
      categoryId: meta?.categoryId ?? "other",
      categoryName: meta ? (CATEGORY_BY_ID.get(meta.categoryId)?.name ?? "Other") : "Other",
      definition: meta?.definition ?? "",
      estimate: estimate.estimate,
      confidence: estimate.confidence,
      status: estimate.status,
      evidenceCount: estimate.evidenceCount,
      projectCount: estimate.projectCount,
      sourceCount: estimate.sourceCount,
      limitations: estimate.limitations,
      related: meta?.related ?? [],
    };
  });

  const visibilityLabel =
    user.profile.visibility === "public"
      ? "Public"
      : user.profile.visibility === "selective"
        ? "Selectively shared"
        : "Private";

  return (
    <div className="space-y-8">
      <PageHeader
        title="My Fingerprint"
        description="A capability representation with its evidence, confidence and known limits attached. It is deliberately not a single score."
        actions={
          <>
            <ButtonLink href={`/u/${user.profile.username}`} size="sm" variant="secondary">
              View public profile
              <ArrowUpRight size={13} />
            </ButtonLink>
            <ButtonLink href="/evidence" size="sm" variant="secondary">
              Evidence explorer
            </ButtonLink>
          </>
        }
        meta={
          <div className="grid gap-4 border-t border-border pt-5 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="label">Identity</p>
              <p className="mt-1 text-[0.8125rem] font-medium">{user.profile.displayName}</p>
              <p className="text-xs text-muted">
                {user.profile.specialization ?? "Software engineer"} · @{user.profile.username}
              </p>
            </div>
            <div>
              <p className="label">RepuH identifier</p>
              <p className="num mt-1 text-[0.8125rem] font-medium">{user.profile.publicId}</p>
              <p className="text-xs text-muted">Stable, shareable, not derived from email</p>
            </div>
            <div>
              <p className="label">Visibility</p>
              <p className="mt-1 flex items-center gap-1.5 text-[0.8125rem] font-medium">
                {user.profile.visibility === "private" ? <EyeOff size={13} /> : <Eye size={13} />}
                {visibilityLabel}
              </p>
              <Link href="/settings#privacy" className="text-xs text-primary hover:underline">
                Change in settings
              </Link>
            </div>
            <div>
              <p className="label">Last updated</p>
              <p className="mt-1 text-[0.8125rem] font-medium">
                {snapshotAt ? formatDateTime(snapshotAt) : "No snapshot yet"}
              </p>
              <p className="text-xs text-muted">
                {integration?.status === "demo" ? "Development adapter" : integration ? "GitHub connected" : "No integration"}
              </p>
            </div>
          </div>
        }
      />

      {fingerprint.skills.some((item) => item.estimate !== null) ? (
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
          <FingerprintIcon size={13} className="text-primary" />
          <span>
            {fingerprint.totals.established} established · {fingerprint.totals.provisional} provisional ·{" "}
            {SKILLS.length - fingerprint.totals.skillsWithEvidence} without evidence
          </span>
          <Badge tone="neutral">algorithm {fingerprint.algorithmVersion}</Badge>
        </div>
      ) : null}

      <FingerprintExplorer
        skills={skills}
        categories={CATEGORIES.map((category) => ({
          id: category.id,
          name: category.name,
          summary: category.summary,
        }))}
        evidenceCount={evidence.length}
        initialSkillId={skill}
        algorithmVersion={fingerprint.algorithmVersion}
      />
    </div>
  );
}
