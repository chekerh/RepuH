import { z } from "zod";
import { assertSameOrigin, fail, ok, parseBody } from "@/lib/http";
import { requireUser, endSession } from "@/lib/auth/session";
import { deleteUserData } from "@/lib/db/queries";
import { audit, getDb } from "@/lib/db";

const deleteSchema = z.object({
  confirmation: z.literal("DELETE"),
});

export async function POST(request: Request) {
  if (!(await assertSameOrigin())) {
    return fail("bad_origin", "Request rejected: origin mismatch.", 403);
  }
  const user = await requireUser();
  const { data, error } = await parseBody(request, deleteSchema);
  if (error) {
    return fail("confirmation_required", 'Type DELETE to confirm account deletion.', 422);
  }

  audit({ userId: user.id, action: "privacy.delete", target: user.email });
  // A real deployment queues this for a retention window. The MVP deletes
  // immediately and states that in the UI.
  deleteUserData(user.id);
  getDb().prepare("DELETE FROM audit_logs WHERE user_id = ?").run(user.id);
  await endSession();

  return ok({ deleted: true, confirmation: data.confirmation });
}
