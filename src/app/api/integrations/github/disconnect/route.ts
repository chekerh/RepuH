import { assertSameOrigin, fail, ok } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { deleteIntegration, getIntegration } from "@/lib/db/queries";
import { audit } from "@/lib/db";

export async function POST() {
  if (!(await assertSameOrigin())) {
    return fail("bad_origin", "Request rejected: origin mismatch.", 403);
  }
  const user = await requireUser();
  const integration = getIntegration(user.id, "github");
  if (!integration) return fail("not_connected", "GitHub is not connected.", 409);

  deleteIntegration(user.id, "github");
  audit({
    userId: user.id,
    action: "integration.github.disconnected",
    target: integration.accountLogin,
  });

  return ok({
    disconnected: true,
    note: "Imported evidence is retained. Remove it from Settings → Data if you want it deleted.",
  });
}
