import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/forms";
import { requireGuest } from "@/lib/auth/session";
import { DEMO_PASSWORD, DEMO_PROFILES } from "@/lib/demo/generator";
import { env } from "@/lib/env";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage() {
  await requireGuest();

  const demoAccounts = env.demoMode
    ? DEMO_PROFILES.map((profile) => ({
        email: profile.email,
        name: profile.displayName,
        persona: profile.specialization,
        password: DEMO_PASSWORD,
      }))
    : [];

  return <LoginForm demoAccounts={demoAccounts} />;
}
