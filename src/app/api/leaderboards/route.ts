import { ok } from "@/lib/http";
import { leaderboard } from "@/lib/db/queries";
import { SKILLS } from "@/lib/ontology";

export async function GET() {
  const results = SKILLS.map((skill) => ({
    skillId: skill.id,
    name: skill.name,
    categoryId: skill.categoryId,
    entries: leaderboard(skill.id, 10),
  })).filter((skill) => skill.entries.length > 0);

  return ok({ skills: results, eligibility: "public profile, leaderboard opt-in, two or more evidence items" });
}
