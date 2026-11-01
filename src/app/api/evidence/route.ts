import { fail, ok } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { listEvidence } from "@/lib/db/queries";

export async function GET(request: Request) {
  const user = await requireUser();
  const url = new URL(request.url);
  const visibility = url.searchParams.get("visibility") ?? "all";
  const skillId = url.searchParams.get("skill") ?? undefined;
  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit") ?? "80")));

  if (!["all", "private", "public", "selective"].includes(visibility)) {
    return fail("validation_failed", "Unknown visibility filter.", 422);
  }

  const evidence = listEvidence(user.id, { visibility, skillId, limit });
  return ok({
    evidence,
    counts: {
      total: evidence.length,
      public: evidence.filter((item) => item.visibility === "public").length,
      disputed: evidence.filter((item) => item.verificationState === "disputed").length,
    },
  });
}
