import { assertSameOrigin, clientKey, fail, ok, rateLimit } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { randomToken, sha256 } from "@/lib/crypto";
import { createApiToken } from "@/lib/db/queries";
import { newId, addDays } from "@/lib/db";
import { audit } from "@/lib/db";

/**
 * Mints a short-lived bearer token for the Chrome extension. The raw token is
 * returned exactly once; only its hash is stored.
 */
export async function POST(request: Request) {
  if (!(await assertSameOrigin())) {
    return fail("bad_origin", "Request rejected: origin mismatch.", 403);
  }
  const user = await requireUser();
  if (!(await rateLimit(await clientKey(`ext-token:${user.id}`), 10, 60_000))) {
    return fail("rate_limited", "Too many pairing attempts.", 429);
  }

  const body = (await request.json().catch(() => ({}))) as { label?: string };
  const label = (body.label ?? "Chrome extension").slice(0, 60);
  const token = randomToken(32);

  createApiToken({
    id: newId("tok"),
    userId: user.id,
    tokenHash: sha256(token),
    label,
    expiresAt: addDays(new Date(), 30).toISOString(),
  });

  audit({ userId: user.id, action: "extension.paired", metadata: { label } });

  return ok({ token, label, expiresInDays: 30 });
}
