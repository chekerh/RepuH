import { assertSameOrigin, fail, ok } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { enableDemoForUser } from "@/lib/demo/seed";
import { activitySummary, getIntegration } from "@/lib/db/queries";
import { computeFingerprint } from "@/lib/services/ingest";
import { env } from "@/lib/env";
import { audit } from "@/lib/db";

/**
 * Development adapter. It is explicitly labelled everywhere it appears and is
 * disabled outside REPUH_DEMO_MODE.
 */
export async function POST() {
  if (!(await assertSameOrigin())) {
    return fail("bad_origin", "Request rejected: origin mismatch.", 403);
  }
  const user = await requireUser();
  if (!env.demoMode) {
    return fail(
      "demo_disabled",
      "The development adapter is disabled. Enable REPUH_DEMO_MODE to use it.",
      409,
    );
  }

  const created = enableDemoForUser(user.id);
  const { fingerprint } = computeFingerprint(user.id);
  const integration = getIntegration(user.id, "github");

  audit({ userId: user.id, action: "integration.demo.seeded", metadata: { created } });

  return ok({
    demo: true,
    imported: created,
    label: "Development adapter — representative data, not live GitHub activity.",
    integration,
    activity: activitySummary(user.id),
    skillsWithEvidence: fingerprint.totals.skillsWithEvidence,
  });
}
