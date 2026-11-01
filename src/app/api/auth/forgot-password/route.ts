import { clientKey, fail, ok, rateLimit } from "@/lib/http";
import { findUserByEmail } from "@/lib/db/queries";
import { emailSchema } from "@/lib/validation/schemas";

/**
 * Recovery entry point. The response never reveals whether an account exists.
 * Mail delivery is an external dependency that this MVP does not configure, so
 * the endpoint records the request and returns the same neutral message.
 */
export async function POST(request: Request) {
  if (!(await rateLimit(await clientKey("recovery"), 5, 60_000))) {
    return fail("rate_limited", "Too many requests. Try again shortly.", 429);
  }

  const body = await request.json().catch(() => null);
  const parsed = emailSchema.safeParse((body as { email?: unknown } | null)?.email);
  if (!parsed.success) {
    return fail("validation_failed", "Enter a valid email address.", 422);
  }

  const user = findUserByEmail(parsed.data);
  if (user) {
    // A real deployment dispatches a signed, single-use reset link here.
    console.info(`[repuh] password recovery requested for account ${user.id.slice(0, 8)}`);
  }

  return ok({
    message:
      "If an account exists for that address, a recovery link has been queued. Mail delivery is not configured in this environment.",
  });
}
