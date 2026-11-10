# Developer console

A read-only operations console for the person running the deployment. It answers
questions about accounts, evidence, certificates, activity, storage,
configuration, security and SEO without adding an analytics script, an APM
agent or a second database.

## Access

```bash
# .env.local — comma-separated, case-insensitive
REPUH_ADMIN_EMAILS=you@example.com,another@example.com
```

Restart the server after changing the value. Sign in with an allowlisted
account; an **Admin** link appears in the product sidebar. A signed-out visitor
is redirected to `/login?next=/admin`. An empty or absent allowlist disables the
surface entirely: `/admin` and `/api/admin/metrics` return `404` for everyone,
so a deployment that forgets the variable does not advertise the surface. A
signed-in non-admin also gets `404` rather than `403`, so the console's existence
is not confirmed.

The local demo allowlist uses `marcus.oyelaran@demo.repuh.local` (password
`repuh-demo-password`). Change it to your own account before a real demo.

## Layout

The console lives in its own route group, `src/app/(admin)`, so it does not
inherit the product shell and can use the full viewport:

- `src/app/(admin)/layout.tsx` — allowlist guard, `noindex` metadata, dynamic
  rendering.
- `src/components/admin/shell.tsx` — dark navigation rail (collapsible, with the
  preference in `localStorage`), sticky top bar with breadcrumb, refresh and an
  "open app" link, and a mobile drawer.
- `src/components/admin/command-palette.tsx` — `⌘K` / `Ctrl+K` section search
  with keyboard navigation. It only knows route names; no data action is
  reachable from it.
- `src/components/admin/charts.tsx` — SVG sparkline, area chart, bar list,
  donut, funnel, progress row and heatmap. No chart dependency is installed.
- `src/components/admin/reveal.tsx` — Framer Motion entrance used per section.
  `useReducedMotion` renders the content immediately instead.
- `src/components/admin/ui.tsx` — console header, panel, KPI card, delta, table
  primitives.

## Routes

| Route | Answers |
| --- | --- |
| `/admin` | Accounts, evidence, public profiles, certificates, sessions, storage, 14-day growth, funnel, visibility mix, connectivity, activity heatmap, newest evidence, platform state |
| `/admin/users` | Search and filter by real/demo/public/unverified/incomplete; evidence volume, last activity, verification and visibility |
| `/admin/evidence` | Signal, skill and verification mix, visibility split, newest rows, and the limits those numbers depend on |
| `/admin/certificates` | Status and revocation, anchor state, signing-key source, newest records with sequence numbers where a receipt exists |
| `/admin/activity` | Ingested events, audit trail, and a 14-day two-hour activity heatmap |
| `/admin/security` | Verification gap, active/expired sessions, audit events, key source, Hedera/GitHub/demo/rate-limit/database posture |
| `/admin/database` | File and WAL size, pragmas, schema version, `quick_check`, exact row counts per table |
| `/admin/seo` | Route registry, sitemap preview, public/demo/private split, robots policy |
| `/admin/monitoring` | Process uptime, memory split, load, one database round-trip, configuration and what the page cannot measure |
| `/admin/finops` | Billable units (storage, evidence, events, certificates, confirmed HCS messages, sessions); no invented currency |
| `/api/admin/metrics` | The same facts plus the daily series and 7-day deltas as JSON; requires an admin session |

## What it deliberately does not do

- **No writes.** There is no delete, re-seed, vacuum, migration or SQL console.
  Opening the console cannot change an account, an anchor or a certificate.
- **No request analytics.** There is no page-view counter, error-rate chart or
  latency percentile, because no APM or third-party script is installed.
- **No composite score.** Counts are counts; nothing ranks people by quality.
- **No cost estimate.** FinOps reports units only. A rate card and billing
  account are not configured, so a monthly total would be fabricated.
- **No secrets.** Emails are visible because this is the developer surface.
  Passwords, session tokens, provider tokens and the certificate private key
  are never selected by an admin query.
- **No raw audit metadata.** Audit rows show action, actor, target and time;
  metadata may contain user-provided content, so it is not rendered.

## Honest limitations

- Every number is point-in-time and recomputed per request. Nothing is cached.
- The charts are computed from the database at request time; they are not a
  metrics store, so nothing older than the stored rows can be plotted.
- `/api/admin/metrics` has no dedicated machine token. External monitoring would
  need a session cookie or a future admin token; neither is implemented.
- There is no alerting, log shipping or backup tooling behind these pages.
- SQLite is single-file and single-node; the database page reports that shape
  rather than pretending it is a managed cluster.
- SEO figures describe the registry and database, not Google's index. No search
  console or crawler API is called.

## Security properties

- Allowlist check on the console layout and the metrics handler, before any
  child renders.
- `robots: { index: false, follow: false }` on the admin segment; `/admin` is
  disallowed in `robots.txt`.
- `Cache-Control: private, no-store` on the JSON endpoint; admin pages are
  dynamic and never prerendered.
- The command palette and navigation carry no mutation path.
