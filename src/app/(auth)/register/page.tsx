import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth/forms";
import { requireGuest } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Create your identity" };

export default async function RegisterPage() {
  await requireGuest();
  return <RegisterForm />;
}
