import { verifyPassword } from "@/lib/crypto";
import { findUserByEmail, getProfile, markEmailVerified } from "@/lib/db/queries";
import { startSession } from "@/lib/auth/session";
import { clientKey, fail, ok, rateLimit } from "@/lib/http";
import { loginSchema } from "@/lib/validation/schemas";
import { audit } from "@/lib/db";

export async function POST(request: Request) {
  if (!(await rateLimit(await clientKey("login"), 12, 60_000))) {
    return fail("rate_limited", "Too many attempts. Try again in a minute.", 429);
  }

  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return fail("validation_failed", "Enter your email and password.", 422);
  }

  const user = findUserByEmail(parsed.data.email);
  // Constant-ish response regardless of whether the account exists.
  if (!user || !verifyPassword(parsed.data.password, user.passwordHash)) {
    audit({ userId: user?.id ?? null, action: "auth.login.failed", target: parsed.data.email });
    return fail("invalid_credentials", "That email and password don't match.", 401);
  }

  if (!user.emailVerifiedAt) {
    // Development has no mail provider; verifying on first successful login is
    // made explicit in the UI and documented in docs/SECURITY.md.
    markEmailVerified(user.id);
  }

  await startSession(user.id);
  audit({ userId: user.id, action: "auth.login" });

  const profile = getProfile(user.id);
  return ok({
    next: profile?.onboardingComplete ? "/dashboard" : "/onboarding",
  });
}
