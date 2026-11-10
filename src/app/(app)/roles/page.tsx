import type { Metadata } from "next";

import { PageHeader } from "@/components/page-header";
import { RoleCoverageExplorer } from "@/components/roles/explorer";
import { requireOnboarded } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Role coverage" };
export const dynamic = "force-dynamic";

export default async function RolesPage() {
  await requireOnboarded();
  return (
    <div className="space-y-8">
      <PageHeader
        title="Role coverage"
        description="Map your attributable evidence against an illustrative role profile. The result is a gap list, not a score."
      />
      <RoleCoverageExplorer />
    </div>
  );
}
