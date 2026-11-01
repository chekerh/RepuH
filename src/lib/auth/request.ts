import { cookies } from "next/headers";
import { sha256 } from "@/lib/crypto";
import { findApiToken, findSession, getSessionUser } from "@/lib/db/queries";
import { SESSION_COOKIE } from "@/lib/auth/session";
import type { SessionUser } from "@/lib/domain/types";

/**
 * Resolve the caller from either a browser session cookie or a bearer token.
 * Bearer tokens are used by the Chrome extension; they are hashed at rest and
 * scoped to one account.
 */
export async function userFromRequest(request: Request): Promise<SessionUser | null> {
  const authorization = request.headers.get("authorization");
  if (authorization?.toLowerCase().startsWith("bearer ")) {
    const token = authorization.slice(7).trim();
    if (!token) return null;
    const hashed = sha256(token);
    const apiToken = findApiToken(hashed);
    if (apiToken) return getSessionUser(apiToken.userId);
    const session = findSession(hashed);
    if (session) return getSessionUser(session.userId);
    return null;
  }

  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = findSession(sha256(token));
  if (!session) return null;
  return getSessionUser(session.userId);
}
