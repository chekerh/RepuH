import { fail, ok } from "@/lib/http";
import { userFromRequest } from "@/lib/auth/request";
import { activeConsent } from "@/lib/db";
import { activitySummary, listActivity } from "@/lib/db/queries";

export async function GET(request: Request) {
  const user = await userFromRequest(request);
  if (!user) return fail("unauthorized", "Pair the extension from your RepuH account.", 401);

  const recent = listActivity(user.id, { source: "extension", limit: 10 });
  return ok({
    account: { username: user.profile.username, displayName: user.profile.displayName },
    observationEnabled: activeConsent(user.id, "browser_observation"),
    recent,
    summary: activitySummary(user.id),
    paused: recent.length === 0,
  });
}
