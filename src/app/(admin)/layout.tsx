import type { Metadata } from "next";
import { cookies } from "next/headers";
import { AdminShell } from "@/components/admin/shell";
import { requireAdmin } from "@/lib/admin/auth";
import { env } from "@/lib/env";

export const metadata: Metadata = {
  title: { default: "Developer console", template: "%s · Admin · RepuH" },
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

/**
 * The console owns its chrome instead of sitting inside the product shell, so
 * the dashboard can use the full viewport and its own navigation. Access is
 * still decided here, before any child renders.
 */
export default async function AdminGroupLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  const collapsed = (await cookies()).get("repuh_admin_rail")?.value === "1";
  return (
    <AdminShell email={user.email} demoMode={env.demoMode} defaultCollapsed={collapsed}>
      {children}
    </AdminShell>
  );
}
