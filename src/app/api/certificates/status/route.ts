import { NextResponse } from "next/server";

import { listRevokedCertificates } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  const revoked = listRevokedCertificates();
  return NextResponse.json(
    {
      statusList: {
        version: 1,
        revoked: revoked.map((entry) => ({
          id: entry.id,
          revokedAt: entry.revokedAt,
          reason: entry.reason,
        })),
      },
    },
    { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } },
  );
}
