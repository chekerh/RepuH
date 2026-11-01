import { requireUser } from "@/lib/auth/session";
import { computeFingerprint } from "@/lib/services/ingest";
import { snapshotHistory } from "@/lib/db/queries";
import { fail, ok } from "@/lib/http";
import { SKILLS_BY_ID, CATEGORY_BY_ID } from "@/lib/ontology";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ skillId: string }> },
) {
  const user = await requireUser();
  const { skillId } = await params;
  const skill = SKILLS_BY_ID.get(skillId);
  if (!skill) return fail("not_found", "Unknown skill.", 404);

  const { fingerprint, evidence } = computeFingerprint(user.id);
  const estimate = fingerprint.skills.find((item) => item.skillId === skillId);
  if (!estimate) return fail("not_found", "No estimate for that skill.", 404);

  const evidenceById = new Map(evidence.map((item) => [item.id, item]));
  const supporting = estimate.contributions
    .map((contribution) => {
      const item = evidenceById.get(contribution.evidenceId);
      return item
        ? {
            id: item.id,
            title: item.title,
            summary: item.summary,
            signal: item.signal,
            occurredAt: item.occurredAt,
            projectReference: item.projectReference,
            source: item.source,
            quality: item.quality,
            visibility: item.visibility,
          }
        : null;
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  return ok({
    skill: {
      id: skill.id,
      name: skill.name,
      definition: skill.definition,
      category: CATEGORY_BY_ID.get(skill.categoryId)?.name ?? skill.categoryId,
      related: skill.related,
    },
    estimate,
    supporting,
    history: snapshotHistory(user.id, skillId, 12),
    algorithmVersion: fingerprint.algorithmVersion,
  });
}
