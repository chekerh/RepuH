import { assertSameOrigin, fail, ok, parseBody } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { verifyAnchorOnChain, verifyInclusion } from "@/lib/blockchain";
import { blockchainVerifySchema } from "@/lib/validation/schemas";

export async function POST(request: Request) {
  if (!(await assertSameOrigin())) {
    return fail("bad_origin", "Request rejected: origin mismatch.", 403);
  }
  const user = await requireUser();
  const { data, error } = await parseBody(request, blockchainVerifySchema);
  if (error) return error;

  const result = verifyInclusion(user.id, data.batchId, data.commitment);
  if (!result.proof) {
    return fail("proof_unavailable", result.reason, 404);
  }

  // Read the anchor back from the network as well. A proof that verifies against
  // a stored root proves inclusion, not that the root reached the chain, so the
  // two results are reported separately rather than merged into one boolean.
  const chain = await verifyAnchorOnChain(user.id, data.batchId);

  return ok({
    verified: result.verified,
    reason: result.reason,
    proof: result.proof,
    chain,
    disclaimer:
      "An anchor proves the integrity of a commitment. It is not proof of skill, employment or identity.",
  });
}
