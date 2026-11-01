import { requireUser } from "@/lib/auth/session";
import { activitySummary } from "@/lib/db/queries";
import { ok } from "@/lib/http";

export async function GET() {
  const user = await requireUser();
  return ok({ summary: activitySummary(user.id) });
}
