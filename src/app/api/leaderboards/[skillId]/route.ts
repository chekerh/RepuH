import { fail, ok } from "@/lib/http";
import { leaderboard } from "@/lib/db/queries";
import { SKILLS_BY_ID } from "@/lib/ontology";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ skillId: string }> },
) {
  const { skillId } = await params;
  const skill = SKILLS_BY_ID.get(skillId);
  if (!skill) return fail("not_found", "Unknown skill.", 404);
  return ok({
    skill: { id: skill.id, name: skill.name, definition: skill.definition },
    entries: leaderboard(skill.id, 50),
  });
}
