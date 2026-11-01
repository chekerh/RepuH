import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Wordmark } from "@/components/brand";
import { OnboardingWizard } from "@/components/onboarding/wizard";
import { requireUser } from "@/lib/auth/session";
import { env } from "@/lib/env";

export const metadata: Metadata = { title: "Set up your identity" };
export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const user = await requireUser("/onboarding");
  if (user.profile.onboardingComplete) redirect("/dashboard");

  return (
    <div className="min-h-dvh">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 w-full max-w-[72rem] items-center justify-between px-4 sm:px-6 lg:px-8">
          <Wordmark />
          <span className="text-xs text-muted">
            Signed in as {user.email} · not verified
          </span>
        </div>
      </header>

      <main id="main" className="mx-auto w-full max-w-[72rem] px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
        <OnboardingWizard
          initial={{
            displayName: user.profile.displayName,
            username: user.profile.username,
            headline: user.profile.headline ?? "",
            country: user.profile.country ?? "",
            demoMode: env.demoMode,
            githubConfigured: env.github.configured,
          }}
        />
      </main>
    </div>
  );
}
