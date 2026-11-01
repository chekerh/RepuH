import { redirect } from "next/navigation";
import { requireOnboarded } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function ProfileRedirectPage() {
  const user = await requireOnboarded();
  redirect(`/u/${user.profile.username}`);
}
