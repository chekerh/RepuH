import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/forms";
import { requireGuest } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage() {
  await requireGuest();
  return <LoginForm />;
}
