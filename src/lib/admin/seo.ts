/**
 * The public route contract, written down once.
 *
 * `sitemap.ts` uses this list, and `/admin/seo` reports it. Dynamic public
 * profiles are appended from the database; certificates stay shareable but
 * `noindex` (see /certificate/[id] metadata) because they expose a claim that
 * the subject may not want indexed.
 */

export interface SeoRoute {
  path: string;
  label: string;
  group: "public" | "share" | "auth" | "private";
  indexable: boolean;
  inSitemap: boolean;
  note?: string;
}

export const SEO_ROUTES: SeoRoute[] = [
  { path: "/", label: "Landing", group: "public", indexable: true, inSitemap: true },
  { path: "/explore", label: "Explore", group: "public", indexable: true, inSitemap: true },
  {
    path: "/leaderboards",
    label: "Leaderboards",
    group: "public",
    indexable: true,
    inSitemap: true,
  },
  { path: "/docs", label: "Documentation", group: "public", indexable: true, inSitemap: true },
  { path: "/help", label: "Help", group: "public", indexable: true, inSitemap: true },
  { path: "/extension", label: "Extension", group: "public", indexable: true, inSitemap: true },
  { path: "/terms", label: "Terms", group: "public", indexable: true, inSitemap: true },
  { path: "/privacy", label: "Privacy", group: "public", indexable: true, inSitemap: true },
  { path: "/contact", label: "Contact", group: "public", indexable: true, inSitemap: true },
  {
    path: "/u/[username]",
    label: "Public profile",
    group: "public",
    indexable: true,
    inSitemap: true,
    note: "Only visibility = public, onboarded, non-demo profiles are listed.",
  },
  {
    path: "/certificate/[id]",
    label: "Certificate",
    group: "share",
    indexable: false,
    inSitemap: false,
    note: "Unlisted but unauthenticated; page metadata is noindex.",
  },
  { path: "/login", label: "Sign in", group: "auth", indexable: false, inSitemap: false },
  { path: "/register", label: "Register", group: "auth", indexable: false, inSitemap: false },
  {
    path: "/forgot-password",
    label: "Password recovery",
    group: "auth",
    indexable: false,
    inSitemap: false,
  },
  {
    path: "/dashboard",
    label: "Dashboard",
    group: "private",
    indexable: false,
    inSitemap: false,
    note: "Authenticated surface; excluded by robots.txt.",
  },
  {
    path: "/admin",
    label: "Developer admin",
    group: "private",
    indexable: false,
    inSitemap: false,
    note: "Allowlist only; metadata is noindex and robots.txt disallows it.",
  },
];

export function sitemapStaticPaths(): string[] {
  return SEO_ROUTES.filter((route) => route.inSitemap && !route.path.includes("[")).map(
    (route) => route.path,
  );
}
