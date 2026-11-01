import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { randomToken } from "@/lib/crypto";
import { requireUser } from "@/lib/auth/session";
import { authorizeUrl } from "@/lib/github/client";
import { env } from "@/lib/env";

export async function GET() {
  await requireUser("/integrations");

  if (!env.github.configured) {
    return NextResponse.json(
      {
        error: {
          code: "github_unconfigured",
          message:
            "GitHub OAuth is not configured in this environment. Add GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET, or use the labelled development adapter.",
        },
      },
      { status: 409 },
    );
  }

  const state = randomToken(24);
  const store = await cookies();
  store.set("repuh_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });

  const redirectUri = `${env.appUrl}/api/integrations/github/callback`;
  return NextResponse.redirect(authorizeUrl(state, redirectUri));
}
