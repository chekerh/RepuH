import { NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/admin/auth";
import { processHealth } from "@/lib/admin/health";
import { currentUser } from "@/lib/auth/session";
import {
  adminDailySeries,
  adminDatabaseFacts,
  adminDatabaseLatency,
  adminDeltas,
  adminFinopsFacts,
  adminOverview,
  adminSecurityFacts,
  adminSeoFacts,
} from "@/lib/db/admin";
import { env } from "@/lib/env";
import { hederaStatus } from "@/lib/hedera/config";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

/**
 * Machine-readable snapshot for manual checks. It deliberately requires an
 * admin session: there is no unauthenticated status endpoint and no token type
 * for external monitoring, so this cannot be mistaken for a public status page.
 */
export async function GET() {
  const user = await currentUser();
  if (!user || !isAdminEmail(user.email)) {
    return json({ error: { code: "not_found", message: "Not found." } }, 404);
  }

  const database = adminDatabaseFacts();
  const hedera = hederaStatus();

  return json({
    generatedAt: new Date().toISOString(),
    overview: adminOverview(),
    trends: { deltas: adminDeltas(), series: adminDailySeries(14) },
    security: adminSecurityFacts(),
    seo: adminSeoFacts(),
    finops: adminFinopsFacts(),
    database: {
      journalMode: database.journalMode,
      pageSize: database.pageSize,
      pageCount: database.pageCount,
      quickCheck: database.quickCheck,
      latencyMs: adminDatabaseLatency(),
    },
    process: processHealth(),
    configuration: {
      demoMode: env.demoMode,
      githubConfigured: env.github.configured,
      hedera: {
        configured: hedera.configured,
        network: hedera.network,
        missing: hedera.missing,
      },
    },
  });
}
