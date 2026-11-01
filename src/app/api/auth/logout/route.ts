import { endSession } from "@/lib/auth/session";
import { ok } from "@/lib/http";

export async function POST() {
  await endSession();
  return ok({ ok: true });
}
