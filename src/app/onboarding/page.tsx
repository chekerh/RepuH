import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Assistant } from "@/components/chat/assistant";
import { requireUser } from "@/lib/auth/session";
import { env } from "@/lib/env";

export const metadata: Metadata = { title: "Set up your identity" };
export const dynamic = "force-dynamic";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ repeat?: string }>;
}) {
  const params = await searchParams;
  const repeat = params?.repeat === "1" || params?.repeat === "true";
  const user = await requireUser("/onboarding");
  if (user.profile.onboardingComplete && !repeat) redirect("/dashboard");

  return (
    <Assistant
      mode="onboarding"
      initial={{
        displayName: user.profile.displayName,
        username: user.profile.username,
        headline: user.profile.headline ?? "",
        country: user.profile.country ?? "",
        bio: user.profile.bio ?? "",
        specialization: user.profile.specialization ?? "",
        demoMode: env.demoMode,
        githubConfigured: env.github.configured,
        onboarded: user.profile.onboardingComplete,
        visibility: user.profile.visibility,
        leaderboardOptIn: user.preferences.leaderboardOptIn,
      }}
    />
  );
}