import type { MetadataRoute } from "next";
import { SEO_ROUTES } from "@/lib/admin/seo";
import { sitemapProfiles } from "@/lib/db/seo";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = (env.appUrl || "http://localhost:3000").replace(/\/$/, "");
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = SEO_ROUTES.filter(
    (route) => route.inSitemap && !route.path.includes("["),
  ).map((route) => ({
    url: route.path === "/" ? `${base}/` : `${base}${route.path}`,
    lastModified: now,
  }));

  // Demo and private profiles stay out: a sitemap is a public index, and demo
  // rows must never be presented as real people.
  const profileEntries: MetadataRoute.Sitemap = sitemapProfiles().map((profile) => ({
    url: `${base}/u/${encodeURIComponent(profile.username)}`,
    lastModified: new Date(profile.updatedAt),
  }));

  return [...staticEntries, ...profileEntries];
}
