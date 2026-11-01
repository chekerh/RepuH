import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { hashPassword } from "@/lib/crypto";
import { createProfile, createUser, findUserByEmail } from "@/lib/db/queries";
import { startSession } from "@/lib/auth/session";
import { clientKey, fail, ok, rateLimit } from "@/lib/http";
import { registerSchema } from "@/lib/validation/schemas";
import { slugifyUsername } from "@/lib/utils";
import { env } from "@/lib/env";

export async function POST(request: Request) {
  if (!(await rateLimit(await clientKey("register"), 10, 60_000))) {
    return fail("rate_limited", "Too many attempts. Try again in a minute.", 429);
  }

  const body = await request.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return fail("validation_failed", "Check the highlighted fields.", 422, parsed.error.flatten());
  }

  const { email, password, displayName } = parsed.data;
  if (findUserByEmail(email)) {
    return fail("email_taken", "An account already exists for that email.", 409);
  }

  const user = createUser({ email, passwordHash: hashPassword(password) });

  let username = slugifyUsername(displayName) || `engineer-${randomUUID().slice(0, 5)}`;
  const exists = getDb().prepare("SELECT 1 FROM profiles WHERE username = ?").get(username);
  if (exists) username = `${username}-${randomUUID().slice(0, 4)}`;

  createProfile({
    userId: user.id,
    displayName,
    username,
    publicId: randomUUID().replace(/-/g, "").slice(0, 12),
    visibility: "private",
  });

  await startSession(user.id);

  // Verification email delivery is an external service. In this MVP the account
  // is created unverified and the UI states that clearly rather than claiming an
  // email was sent.
  return ok(
    {
      user: { id: user.id, email: user.email },
      emailVerification: env.isProduction ? "required" : "development-bypass",
      next: "/onboarding",
    },
    201,
  );
}

export function GET() {
  return NextResponse.json({ error: { code: "method_not_allowed" } }, { status: 405 });
}
