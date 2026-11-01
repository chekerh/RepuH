import { assertSameOrigin, fail, ok } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { getPreferences, getProfile, updateProfile } from "@/lib/db/queries";
import { profileSchema } from "@/lib/validation/schemas";
import { audit } from "@/lib/db";

export async function GET() {
  const user = await requireUser();
  return ok({ profile: user.profile, preferences: user.preferences });
}

export async function PATCH(request: Request) {
  if (!(await assertSameOrigin())) {
    return fail("bad_origin", "Request rejected: origin mismatch.", 403);
  }
  const user = await requireUser();
  const body = await request.json().catch(() => null);
  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) {
    return fail("validation_failed", "Check the highlighted fields.", 422, parsed.error.flatten());
  }

  updateProfile(user.id, {
    ...(parsed.data.displayName !== undefined ? { displayName: parsed.data.displayName } : {}),
    ...(parsed.data.headline !== undefined ? { headline: parsed.data.headline || null } : {}),
    ...(parsed.data.bio !== undefined ? { bio: parsed.data.bio || null } : {}),
    ...(parsed.data.country !== undefined ? { country: parsed.data.country || null } : {}),
    ...(parsed.data.specialization !== undefined
      ? { specialization: parsed.data.specialization || null }
      : {}),
    ...(parsed.data.visibility !== undefined ? { visibility: parsed.data.visibility } : {}),
  });

  audit({ userId: user.id, action: "profile.update", target: "profile" });
  return ok({ profile: getProfile(user.id), preferences: getPreferences(user.id) });
}
