import { NextResponse } from "next/server";
import { getDb, recordConsent } from "@/lib/db";
import { assertSameOrigin, fail, ok } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { getPreferences, updatePreferences, updateProfile } from "@/lib/db/queries";
import { onboardingSchema } from "@/lib/validation/schemas";
import { enableDemoForUser } from "@/lib/demo/seed";
import { env } from "@/lib/env";

export async function POST(request: Request) {
  if (!(await assertSameOrigin())) {
    return fail("bad_origin", "Request rejected: origin mismatch.", 403);
  }
  const user = await requireUser();
  const body = await request.json().catch(() => null);
  const parsed = onboardingSchema.safeParse(body);
  if (!parsed.success) {
    return fail("validation_failed", "Check the highlighted fields.", 422, parsed.error.flatten());
  }

  const input = parsed.data;
  const taken = getDb()
    .prepare("SELECT user_id FROM profiles WHERE username = ? AND user_id != ?")
    .get(input.username, user.id);
  if (taken) {
    return fail("username_taken", "That username is already in use.", 409);
  }

  updateProfile(user.id, {
    displayName: input.displayName,
    username: input.username,
    headline: input.headline || null,
    bio: input.bio || null,
    country: input.country || null,
    specialization: input.specialization || null,
    visibility: input.visibility,
    onboardingComplete: true,
  });

  const preferences = getPreferences(user.id);
  updatePreferences(user.id, { leaderboardOptIn: input.leaderboardOptIn });
  if (preferences.leaderboardOptIn !== input.leaderboardOptIn) {
    console.info(`[repuh] leaderboard preference changed for ${user.id.slice(0, 8)}`);
  }

  recordConsent({
    userId: user.id,
    purpose: "github_observation",
    scope: "public repository metadata, pull requests, reviews and issues",
    granted: false,
  });
  recordConsent({
    userId: user.id,
    purpose: "browser_observation",
    scope: "allowlisted professional documentation domains only",
    granted: false,
  });

  if (input.useDemoData && env.demoMode) {
    enableDemoForUser(user.id);
  }

  return ok({
    completed: true,
    demoData: Boolean(input.useDemoData && env.demoMode),
    next:
      input.connectGithub && env.github.configured
        ? "/api/integrations/github/connect"
        : input.connectGithub
          ? "/integrations?github=unconfigured"
          : "/dashboard",
  });
}

export function GET() {
  return NextResponse.json({ error: { code: "method_not_allowed" } }, { status: 405 });
}
