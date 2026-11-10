/**
 * Developer admin guard.
 *
 * The surface is allowlisted by email. With no `REPUH_ADMIN_EMAILS` value the
 * list is empty, so every admin route returns 404 — deploying without the
 * variable does not silently expose the dashboard. A 404 (rather than 403)
 * also avoids confirming that the surface exists to a signed-in non-admin.
 */

import { notFound, redirect } from "next/navigation";
import { currentUser } from "@/lib/auth/session";
import type { SessionUser } from "@/lib/domain/types";
import { env } from "@/lib/env";

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return env.adminEmails.includes(email.trim().toLowerCase());
}

export function adminConfigured(): boolean {
  return env.adminEmails.length > 0;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await currentUser();
  // The console is its own route group, so it no longer inherits the product
  // layout's sign-in redirect. Send a signed-out visitor to the login form
  // rather than showing a 404 for a surface they are allowed to reach.
  if (!user) redirect("/login?next=/admin");
  if (!isAdminEmail(user.email)) notFound();
  return user;
}
