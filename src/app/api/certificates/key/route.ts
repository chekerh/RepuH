import { ok } from "@/lib/http";
import { publishedKey } from "@/lib/certificates/keys";
import { CERTIFICATE_VERSION } from "@/lib/certificates/payload";

export const dynamic = "force-dynamic";

/**
 * The public half of the certificate signing key. Published so a holder can
 * verify a downloaded certificate without calling this deployment again.
 */
export async function GET() {
  const key = publishedKey();
  return ok({
    ...key,
    certificateVersion: CERTIFICATE_VERSION,
    note:
      "Ed25519 over the canonical JSON payload. Verify against this key, not against the server's word.",
  });
}
