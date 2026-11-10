import { z } from "zod";

import {
  assertSameOrigin,
  clientKey,
  fail,
  ok,
  parseBody,
  rateLimit,
  unauthorized,
} from "@/lib/http";
import { currentUser } from "@/lib/auth/session";
import { revokeCertificate } from "@/lib/certificates/service";
import { findCertificate } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

const revokeSchema = z.object({
  reason: z.string().trim().max(280).optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await assertSameOrigin())) {
    return fail("bad_origin", "Request rejected: origin mismatch.", 403);
  }
  const user = await currentUser();
  if (!user) return unauthorized();

  const { id } = await params;
  const certificate = findCertificate(id);
  if (!certificate || certificate.userId !== user.id) {
    return fail("not_found", "Certificate not found.", 404);
  }

  const key = await clientKey("certificates");
  if (!rateLimit(`${key}:${user.id}`, 10, 3_600_000)) {
    return fail("rate_limited", "Certificate actions are limited to 10 per hour.", 429);
  }

  const { data, error } = await parseBody(request, revokeSchema);
  if (error) return error;

  const result = await revokeCertificate(user.id, id, data.reason ?? null);
  if (!result) {
    return fail("not_found", "Certificate not found.", 404);
  }

  const revoked = result.certificate;
  return ok({
    registryRevocation: result.registryRevocation,
    id: revoked.id,
    status: revoked.status,
    revokedAt: revoked.revokedAt,
    reason: revoked.revocationReason,
  });
}
