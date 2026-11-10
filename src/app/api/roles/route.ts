import { NextResponse } from "next/server";

import { currentUser } from "@/lib/auth/session";
import { ROLE_PROFILES } from "@/lib/roles";
import { unauthorized } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await currentUser();
  if (!user) return unauthorized();
  if (!user.profile.onboardingComplete) {
    return NextResponse.json(
      { error: { code: "onboarding_incomplete", message: "Finish onboarding first." } },
      { status: 409 },
    );
  }

  return NextResponse.json({
    version: "repuh-roles-1.0.0",
    roles: ROLE_PROFILES.map((role) => ({
      id: role.id,
      name: role.name,
      summary: role.summary,
      requirementCount: role.requirements.length,
      coreCount: role.requirements.filter((item) => item.importance === "core").length,
    })),
  });
}
