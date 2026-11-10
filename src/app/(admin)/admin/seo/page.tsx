import type { Metadata } from "next";
import Link from "next/link";
import { Reveal } from "@/components/admin/reveal";
import { ConsoleHeader, Empty, Kpi, Panel, TableShell, Td, Th } from "@/components/admin/ui";
import { Badge } from "@/components/ui";
import { count, percent } from "@/lib/admin/format";
import { SEO_ROUTES } from "@/lib/admin/seo";
import { adminSeoFacts } from "@/lib/db/admin";
import { sitemapProfiles } from "@/lib/db/seo";
import { env } from "@/lib/env";

export const metadata: Metadata = { title: "SEO" };

const GROUPS = ["public", "share", "auth", "private"] as const;

export default async function AdminSeoPage() {
  const facts = adminSeoFacts();
  const profiles = sitemapProfiles(20);
  const staticPaths = SEO_ROUTES.filter((route) => route.inSitemap && !route.path.includes("["));
  const indexable = SEO_ROUTES.filter((route) => route.indexable);
  const base = env.appUrl.replace(/\/$/, "");

  return (
    <div className="space-y-6">
      <ConsoleHeader
        eyebrow="Platform"
        title="Search visibility"
        description="The public route contract, written down once and reused by sitemap.ts, robots.ts and this page. A sitemap is a public index, so demo and private profiles are excluded before serialisation."
        actions={
          <>
            <Link href="/sitemap.xml" className="text-[0.75rem] text-primary hover:underline">
              sitemap.xml
            </Link>
            <Link href="/robots.txt" className="text-[0.75rem] text-primary hover:underline">
              robots.txt
            </Link>
          </>
        }
        meta={
          <div className="flex flex-wrap items-center gap-2 text-[0.6875rem] text-muted">
            <Badge tone="primary">{indexable.length} indexable routes</Badge>
            <Badge tone="neutral">{staticPaths.length} sitemap entries</Badge>
            <Badge tone="warning">{count(facts.demoPublicProfiles)} demo profiles excluded</Badge>
            <span className="ml-auto font-mono">{base}</span>
          </div>
        }
      />

      <Reveal>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi
            label="Indexable profiles"
            value={count(facts.publicProfiles)}
            hint="public, onboarded, non-demo"
          />
          <Kpi
            label="Demo profiles held back"
            value={count(facts.demoPublicProfiles)}
            hint="public visibility but is_demo = 1"
            accent="var(--warning)"
          />
          <Kpi
            label="Private profiles"
            value={count(facts.privateProfiles)}
            hint="never listed or indexable"
            accent="var(--muted)"
          />
          <Kpi
            label="Shareable certificates"
            value={count(facts.certificates)}
            hint="unlisted, noindex by metadata"
            accent="var(--accent)"
          />
        </div>
      </Reveal>

      <Reveal delay={0.05}>
        <Panel
          title="Route registry"
          description="Indexable and sitemap flags are declared per route. Private and auth routes are excluded from both."
          flush
        >
          <div className="p-4">
            <TableShell minWidth="54rem">
              <thead>
                <tr>
                  <Th>Route</Th>
                  <Th>Group</Th>
                  <Th>Indexable</Th>
                  <Th>In sitemap</Th>
                  <Th>Note</Th>
                </tr>
              </thead>
              <tbody>
                {GROUPS.flatMap((group) =>
                  SEO_ROUTES.filter((route) => route.group === group).map((route) => (
                    <tr key={route.path}>
                      <Td className="font-mono text-[0.6875rem]">{route.path}</Td>
                      <Td className="text-[0.75rem] text-muted">{route.group}</Td>
                      <Td>
                        <Badge tone={route.indexable ? "success" : "neutral"}>
                          {route.indexable ? "yes" : "no"}
                        </Badge>
                      </Td>
                      <Td>
                        <Badge tone={route.inSitemap ? "primary" : "neutral"}>
                          {route.inSitemap ? "yes" : "no"}
                        </Badge>
                      </Td>
                      <Td className="max-w-[26rem] text-[0.6875rem] leading-relaxed text-muted">
                        {route.note ?? "—"}
                      </Td>
                    </tr>
                  )),
                )}
              </tbody>
            </TableShell>
          </div>
        </Panel>
      </Reveal>

      <div className="grid gap-4 xl:grid-cols-2">
        <Reveal>
          <Panel
            title="Sitemap preview"
            description={`Static public routes plus up to 20 real profiles. ${percent(facts.demoPublicProfiles, Math.max(facts.publicProfiles + facts.demoPublicProfiles, 1))} of public profiles are excluded as demo.`}
          >
            <ol className="space-y-1.5 text-[0.75rem]">
              {staticPaths.map((route) => (
                <li key={route.path} className="truncate font-mono text-muted">
                  {route.path}
                </li>
              ))}
              {profiles.map((profile) => (
                <li key={profile.username} className="truncate font-mono text-muted">
                  /u/{profile.username}
                </li>
              ))}
            </ol>
            {profiles.length === 0 ? (
              <p className="mt-3 text-[0.6875rem] text-muted">
                No real public profile currently meets the sitemap filter.
              </p>
            ) : null}
          </Panel>
        </Reveal>

        <Reveal delay={0.05}>
          <Panel title="Robots policy" description="Disallowed paths are app surfaces, not content.">
            <div className="space-y-2 font-mono text-[0.75rem]">
              {[
                "/admin",
                "/api/",
                "/dashboard",
                "/profile",
                "/settings",
                "/onboarding",
                "/evidence",
                "/certificates",
                "/fingerprint",
                "/integrations",
                "/assistant",
              ].map((path) => (
                <p key={path} className="flex items-center justify-between border-b border-border pb-1.5">
                  <span className="text-muted">Disallow: {path}</span>
                  <Badge tone="neutral">blocked</Badge>
                </p>
              ))}
            </div>
            <p className="mt-3 text-[0.6875rem] leading-relaxed text-muted">
              No analytics, tag manager or tracking script is loaded on any route. Indexability is the
              only SEO signal this app controls.
            </p>
          </Panel>
        </Reveal>
      </div>

      {profiles.length === 0 && staticPaths.length === 0 ? (
        <Empty>Nothing is currently exposed to search engines.</Empty>
      ) : null}
    </div>
  );
}
