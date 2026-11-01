import { assertSameOrigin, fail, ok, parseBody } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { recordConsent, audit } from "@/lib/db";
import { consentSchema } from "@/lib/validation/schemas";

const SCOPES: Record<string, string> = {
  github_observation: "public repository metadata, pull requests, reviews and issues",
  browser_observation: "allowlisted professional documentation domains only",
  ai_classification: "deterministic classification of metadata; no source code leaves the system",
};

export async function POST(request: Request) {
  if (!(await assertSameOrigin())) {
    return fail("bad_origin", "Request rejected: origin mismatch.", 403);
  }
  const user = await requireUser();
  const { data, error } = await parseBody(request, consentSchema);
  if (error) return error;

  recordConsent({
    userId: user.id,
    purpose: data.purpose,
    scope: data.scope ?? SCOPES[data.purpose] ?? "unspecified",
    granted: data.granted,
  });
  audit({
    userId: user.id,
    action: data.granted ? "consent.granted" : "consent.revoked",
    target: data.purpose,
  });

  return ok({ purpose: data.purpose, granted: data.granted });
}
