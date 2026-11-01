import { requireUser } from "@/lib/auth/session";
import { exportUserData } from "@/lib/db/queries";
import { NextResponse } from "next/server";
import { audit } from "@/lib/db";

export async function GET() {
  const user = await requireUser();
  const data = exportUserData(user.id);
  audit({ userId: user.id, action: "privacy.export" });

  return new NextResponse(JSON.stringify(data, null, 2), {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="repuh-export-${user.profile.username}.json"`,
      "cache-control": "no-store",
    },
  });
}
