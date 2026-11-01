import { assertSameOrigin, fail, ok } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { listIntegrations } from "@/lib/db/queries";

export async function GET() {
  const user = await requireUser();
  return ok({ integrations: listIntegrations(user.id) });
}

export async function POST() {
  if (!(await assertSameOrigin())) {
    return fail("bad_origin", "Request rejected: origin mismatch.", 403);
  }
  await requireUser();
  return fail("not_implemented", "Use a provider-specific endpoint.", 400);
}
