import { fail, ok } from "@/lib/http";
import { getProfileByUsername, listIntegrations, publicEvidenceFor, topSkillsFor } from "@/lib/db/queries";
import { computeFingerprint } from "@/lib/services/ingest";

/**
 * Public projection. Built from a scoped query, never by returning a private
 * record and filtering in the browser. Private events, consent, tokens and
 * unshared evidence never appear here.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  const { username } = await params;
  const profile = getProfileByUsername(username);
  if (!profile) return fail("not_found", "No profile exists at that address.", 404);
  if (profile.visibility === "private") {
    return fail("not_public", "This profile is private.", 403);
  }

  const { fingerprint } = computeFingerprint(profile.userId);
  const skills = fingerprint.skills
    .filter((skill) => skill.estimate !== null)
    .map((skill) => ({
      skillId: skill.skillId,
      estimate: skill.estimate,
      confidence: skill.confidence,
      status: skill.status,
      evidenceCount: skill.evidenceCount,
    }));

  return ok({
    profile: {
      username: profile.username,
      displayName: profile.displayName,
      headline: profile.headline,
      bio: profile.bio,
      country: profile.country,
      profession: profile.profession,
      specialization: profile.specialization,
      publicId: profile.publicId,
      visibility: profile.visibility,
      isDemo: profile.isDemo,
      updatedAt: profile.updatedAt,
    },
    skills,
    evidence: publicEvidenceFor(profile.userId).map((item) => ({
      id: item.id,
      title: item.title,
      summary: item.summary,
      signal: item.signal,
      skillIds: item.skillIds,
      verificationState: item.verificationState,
      occurredAt: item.occurredAt,
      visibility: item.visibility,
    })),
    topSkills: topSkillsFor(profile.userId),
    integrations: listIntegrations(profile.userId)
      .filter((integration) => integration.status === "connected" || integration.status === "demo")
      .map((integration) => ({ provider: integration.provider, status: integration.status })),
    algorithmVersion: fingerprint.algorithmVersion,
  });
}
