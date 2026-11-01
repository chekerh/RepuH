import { fail, ok } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { activitySummary, listActivity } from "@/lib/db/queries";

export async function GET(request: Request) {
  const user = await requireUser();
  const url = new URL(request.url);
  const source = url.searchParams.get("source") ?? "all";
  const type = url.searchParams.get("type") ?? "all";
  const days = Number(url.searchParams.get("days") ?? "0");
  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit") ?? "60")));

  if (Number.isNaN(days) || Number.isNaN(limit)) {
    return fail("validation_failed", "Filters must be numeric.", 422);
  }

  return ok({
    events: listActivity(user.id, { source, eventType: type, days, limit }),
    summary: activitySummary(user.id),
  });
}
