import type { Metadata } from "next";
import { RecoveryForm } from "@/components/auth/forms";
import { requireGuest } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Recover access" };

export default async function ForgotPasswordPage() {
  await requireGuest();
  return <RecoveryForm />;
}
