import { z } from "zod";
import { assertSameOrigin, fail, ok, parseBody } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { getPreferences, updatePreferences } from "@/lib/db/queries";
import { audit } from "@/lib/db";

const settingsSchema = z.object({
  theme: z.enum(["system", "light", "dark"]).optional(),
  reducedMotion: z.boolean().optional(),
  notifications: z.boolean().optional(),
  language: z.string().min(2).max(12).optional(),
  leaderboardOptIn: z.boolean().optional(),
});

export async function GET() {
  const user = await requireUser();
  return ok({ preferences: user.preferences });
}

export async function PATCH(request: Request) {
  if (!(await assertSameOrigin())) {
    return fail("bad_origin", "Request rejected: origin mismatch.", 403);
  }
  const user = await requireUser();
  const { data, error } = await parseBody(request, settingsSchema);
  if (error) return error;

  updatePreferences(user.id, data);
  audit({ userId: user.id, action: "settings.update", metadata: data });
  return ok({ preferences: getPreferences(user.id) });
}
