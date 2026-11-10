import { NextResponse } from "next/server";

import { currentUser } from "@/lib/auth/session";
import { buildRoleCoverage, getRoleProfile } from "@/lib/roles";
import { unauthorized } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ roleId: string }> },
) {
  const user = await currentUser();
  if (!user) return unauthorized();
  if (!user.profile.onboardingComplete) {
    return NextResponse.json(
      { error: { code: "onboarding_incomplete", message: "Finish onboarding first." } },
      { status: 409 },
    );
  }

  const { roleId } = await params;
  const role = getRoleProfile(roleId);
  if (!role) {
    return NextResponse.json({ error: { code: "not_found", message: "Role not found." } }, { status: 404 });
  }

  const coverage = buildRoleCoverage(user.id, roleId);
  if (!coverage) {
    return NextResponse.json({ error: { code: "not_found", message: "Role not found." } }, { status: 404 });
  }

  return NextResponse.json(coverage);
}
