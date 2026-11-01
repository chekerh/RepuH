import { requireUser } from "@/lib/auth/session";
import { computeFingerprint } from "@/lib/services/ingest";
import { latestSnapshotAt } from "@/lib/db/queries";
import { ok } from "@/lib/http";

export async function GET() {
  const user = await requireUser();
  const { fingerprint, evidence } = computeFingerprint(user.id);
  return ok({
    fingerprint,
    snapshotAt: latestSnapshotAt(user.id),
    evidenceCount: evidence.length,
    method: {
      algorithmVersion: fingerprint.algorithmVersion,
      halfLifeDays: 180,
      caveat:
        "Estimates are deterministic functions of attributable evidence. Confidence is reported separately and never merged into a single overall score.",
    },
  });
}
