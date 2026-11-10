import { AppShell } from "@/components/app-shell";
import { isAdminEmail } from "@/lib/admin/auth";
import { requireOnboarded } from "@/lib/auth/session";
import { getIntegration } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireOnboarded();
  const integration = getIntegration(user.id, "github");
  const demo = integration?.status === "demo";

  return (
    <AppShell
      user={user}
      demo={demo}
      observing={Boolean(integration)}
      admin={isAdminEmail(user.email)}
    >
      {children}
    </AppShell>
  );
}
