/** Public profile slugs for the sitemap. Private and demo profiles are excluded. */

import { getDb } from "@/lib/db";

export function sitemapProfiles(limit = 5000): Array<{ username: string; updatedAt: string }> {
  return getDb()
    .prepare(
      `SELECT username, updated_at AS updatedAt
         FROM profiles
        WHERE visibility = 'public' AND onboarding_complete = 1 AND is_demo = 0
        ORDER BY updated_at DESC
        LIMIT ?`,
    )
    .all(limit) as Array<{ username: string; updatedAt: string }>;
}
