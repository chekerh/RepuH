import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { env } from "@/lib/env";

export type ApiError = {
  error: { code: string; message: string; details?: unknown };
};

export function ok<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function fail(code: string, message: string, status = 400, details?: unknown) {
  return NextResponse.json<ApiError>({ error: { code, message, details } }, { status });
}

export function unauthorized() {
  return fail("unauthorized", "You need to sign in to do that.", 401);
}

export function notFound(message = "Not found") {
  return fail("not_found", message, 404);
}

export function rateLimited() {
  return fail("rate_limited", "Too many requests. Try again shortly.", 429);
}

/**
 * Reject cross-site mutations. Combined with SameSite=Lax cookies this closes
 * the straightforward CSRF path; every mutating handler calls it.
 */
export async function assertSameOrigin(): Promise<boolean> {
  const headerList = await headers();
  const origin = headerList.get("origin");
  const referer = headerList.get("referer");
  const host = headerList.get("host");
  if (!host) return false;

  const expected = env.appUrl ? new URL(env.appUrl).host : host;
  const candidate = origin ?? referer;
  if (!candidate) {
    // Non-browser callers (cron, tests) are authenticated by bearer token or
    // session and are not subject to browser CSRF.
    return true;
  }
  try {
    const url = new URL(candidate);
    return url.host === host || url.host === expected;
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------ rate limiting */

const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= limit) return false;
  bucket.count += 1;
  return true;
}

export async function clientKey(scope: string) {
  const headerList = await headers();
  const forwarded = headerList.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() ?? headerList.get("x-real-ip") ?? "local";
  return `${scope}:${ip}`;
}

export async function parseBody<T extends z.ZodTypeAny>(
  request: Request,
  schema: T,
): Promise<{ data: z.infer<T>; error: null } | { data: null; error: NextResponse }> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return { data: null, error: fail("invalid_json", "Request body must be valid JSON.", 400) };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return {
      data: null,
      error: fail("validation_failed", "Some fields need attention.", 422, parsed.error.flatten()),
    };
  }
  return { data: parsed.data, error: null };
}
