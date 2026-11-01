import { assertSameOrigin, clientKey, fail, ok, rateLimit } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { syncGithub } from "@/lib/github/sync";
import { computeFingerprint, recomputeAndSnapshot } from "@/lib/services/ingest";
import { activitySummary, getIntegration } from "@/lib/db/queries";
import { assertSecretInProduction } from "@/lib/env";

export async function POST() {
  if (!(await assertSameOrigin())) {
    return fail("bad_origin", "Request rejected: origin mismatch.", 403);
  }
  assertSecretInProduction();
  const user = await requireUser();

  if (!(await rateLimit(await clientKey(`sync:${user.id}`), 6, 60_000))) {
    return fail("rate_limited", "Sync is limited to six runs a minute.", 429);
  }

  const integration = getIntegration(user.id, "github");
  if (!integration) {
    return fail("not_connected", "Connect GitHub before syncing.", 409);
  }

  const report = await syncGithub(user.id);
  const fingerprint = recomputeAndSnapshot(user.id);
  const { fingerprint: live } = computeFingerprint(user.id);

  return ok({
    ...report,
    demo: integration.status === "demo",
    activity: activitySummary(user.id),
    skillsWithEvidence: live.totals.skillsWithEvidence,
    snapshotAt: fingerprint.generatedAt,
  });
}
