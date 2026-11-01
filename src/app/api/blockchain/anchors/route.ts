import { assertSameOrigin, clientKey, fail, ok, rateLimit } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { listAnchors } from "@/lib/db/queries";
import { anchorEvidence, providerStatus } from "@/lib/blockchain";
import { audit } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await requireUser();
  return ok({
    anchors: listAnchors(user.id),
    ...providerStatus(),
  });
}

export async function POST() {
  if (!(await assertSameOrigin())) {
    return fail("bad_origin", "Request rejected: origin mismatch.", 403);
  }
  const user = await requireUser();

  const key = await clientKey("anchors");
  if (!rateLimit(`${key}:${user.id}`, 6, 3_600_000)) {
    return fail("rate_limited", "Anchoring is limited to 6 batches per hour.", 429);
  }

  try {
    const { anchor } = await anchorEvidence(user.id);
    audit({
      userId: user.id,
      action: "blockchain.anchor.created",
      target: String(anchor.batchId),
      metadata: {
        leaves: anchor.leafCount,
        status: anchor.status,
        provider: anchor.provider,
        sequence: anchor.sequenceNumber,
      },
    });
    return ok({ anchor, ...providerStatus() }, 201);
  } catch (cause) {
    // A failed HCS submit must not create a batch row. The message is safe to
    // return: it names the integration state, not a credential or payload.
    const message =
      cause instanceof Error
        ? cause.message
        : "The batch could not be anchored. Nothing was recorded.";
    return fail("anchor_failed", message, 409);
  }
}
