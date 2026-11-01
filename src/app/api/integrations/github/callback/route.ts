import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { encryptSecret } from "@/lib/crypto";
import { requireUser } from "@/lib/auth/session";
import { exchangeCode, fetchViewer } from "@/lib/github/client";
import { upsertIntegration } from "@/lib/db/queries";
import { audit } from "@/lib/db";
import { syncGithub } from "@/lib/github/sync";
import { recomputeAndSnapshot } from "@/lib/services/ingest";
import { env } from "@/lib/env";

export async function GET(request: Request) {
  const user = await requireUser("/integrations");
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  const store = await cookies();
  const expectedState = store.get("repuh_oauth_state")?.value;

  if (error || !code) {
    return NextResponse.redirect(`${env.appUrl}/integrations?github=denied`);
  }
  if (!state || !expectedState || state !== expectedState) {
    audit({ userId: user.id, action: "integration.github.state_mismatch" });
    return NextResponse.redirect(`${env.appUrl}/integrations?github=state`);
  }
  store.delete("repuh_oauth_state");

  try {
    const token = await exchangeCode(code, `${env.appUrl}/api/integrations/github/callback`);
    const viewer = await fetchViewer(token);

    upsertIntegration({
      userId: user.id,
      provider: "github",
      accountLogin: viewer.login,
      scopes: ["read:user", "public_repo"],
      status: "connected",
      accessTokenEncrypted: encryptSecret(token),
    });

    audit({ userId: user.id, action: "integration.github.connected", target: viewer.login });

    const report = await syncGithub(user.id);
    recomputeAndSnapshot(user.id);

    return NextResponse.redirect(
      `${env.appUrl}/integrations?github=connected&imported=${report.imported}`,
    );
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "Connection failed";
    audit({
      userId: user.id,
      action: "integration.github.failed",
      metadata: { message },
    });
    return NextResponse.redirect(
      `${env.appUrl}/integrations?github=error&message=${encodeURIComponent(message.slice(0, 140))}`,
    );
  }
}
