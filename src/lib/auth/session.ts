import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { randomToken, sha256 } from "@/lib/crypto";
import {
  createSession,
  deleteSession,
  findSession,
  getSessionUser,
} from "@/lib/db/queries";
import type { SessionUser } from "@/lib/domain/types";
import { addDays } from "@/lib/db";

export const SESSION_COOKIE = "repuh_session";
const SESSION_TTL_DAYS = 30;

export async function startSession(userId: string): Promise<void> {
  const token = randomToken(32);
  const headerList = await headers();
  createSession({
    id: sha256(token),
    userId,
    expiresAt: addDays(new Date(), SESSION_TTL_DAYS).toISOString(),
    userAgent: headerList.get("user-agent")?.slice(0, 200) ?? null,
  });

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_DAYS * 24 * 60 * 60,
  });
}

export async function endSession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) deleteSession(sha256(token));
  store.delete(SESSION_COOKIE);
}

export async function currentUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = findSession(sha256(token));
  if (!session) return null;
  return getSessionUser(session.userId);
}

export async function requireUser(next = "/dashboard"): Promise<SessionUser> {
  const user = await currentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}

export async function requireOnboarded(next = "/dashboard"): Promise<SessionUser> {
  const user = await requireUser(next);
  if (!user.profile.onboardingComplete) redirect("/onboarding");
  return user;
}

export async function requireGuest(): Promise<void> {
  const user = await currentUser();
  if (user) redirect(user.profile.onboardingComplete ? "/dashboard" : "/onboarding");
}
