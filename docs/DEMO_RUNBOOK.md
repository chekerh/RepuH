# Demo runbook

A short, honest path through the MVP for a live walkthrough.

## Before the demo

```bash
pnpm dev            # http://localhost:3000
```

`.env.local` must keep `REPUH_DEMO_MODE=true`; the demo accounts and the
development adapter are disabled without it.

Warm the routes once, in this order, so the first visit is not spent compiling:
`/`, `/login`, `/dashboard`, `/fingerprint`, `/evidence`, `/certificates`,
`/settings`, `/integrations`, `/explore`, `/leaderboards`.

## Accounts

All five use the password `repuh-demo-password`. The sign-in screen lists them;
clicking one fills the form. Every seeded record carries a DEMO badge.

| Email | Persona |
| --- | --- |
| `aisha.rahman@demo.repuh.local` | Backend / TypeScript, public profile `aisha-dev` |
| `marcus.oyelaran@demo.repuh.local` | Platform engineering, public profile |
| `lena.fischer@demo.repuh.local` | Frontend / design systems, public profile |
| `diego.salas@demo.repuh.local` | Data engineering, public profile |
| `priya.nair@demo.repuh.local` | Infrastructure, public profile |

## Six-minute walkthrough

1. **Landing** — the sphere is a gallery of capability screens; drag to spin.
   Point at the claim under the copy: no tests, no composite score, Hedera
   timestamps not configured here.
2. **Sign in as Aisha** → dashboard. Established vs provisional counts, evidence
   records, and mean confidence stated as confidence, never as proficiency.
3. **My Fingerprint** → open a capability. The drawer shows the evidence behind
   it, the confidence, and the limitations together.
4. **Evidence** → change one item's visibility from public to private, reload,
   show it persisted. This is the privacy control, not a settings toggle.
5. **Certificates** → issue one for a skill. Open it: Ed25519 signature,
   payload hash, JSON download. The status reads "Not anchored" (the list shows
   `unanchored`) because no Hedera topic is configured — say that plainly
   instead of implying a timestamp exists.
6. **Settings** → edit the headline and save; revoke and re-grant GitHub
   observation consent; download the JSON export.
7. **Integrations** → the connection is the labelled development adapter. Sync
   runs against it. GitHub OAuth is not configured, so there is no live connect.
8. **Explore / Leaderboards** → `/u/aisha-dev` shows what a signed-out visitor
   sees: a scoped projection, no private records.

## What is real and what is not configured

Real: SQLite persistence, ontology classification, scoring with confidence and
limitations, Ed25519 certificate signing, Merkle inclusion proofs, visibility,
consent records with audit trail, account export.

Not configured, and stated as such in the UI: Hedera anchoring (empty topic id),
GitHub OAuth (development adapter instead), Chrome Web Store publication (the
extension builds unpacked).

## If something goes wrong

- Landing looks stuck: press `Escape`, or `Skip waiting` appears after 4s; the
  loader also dismisses itself after 12s.
- Sign-in returns 429: the limit is 12 attempts per minute. Wait 60 seconds.
- Dev server died: rerun `pnpm dev` and reload.
- Data looks wrong: `rm data/repuh.db && pnpm db:seed` rebuilds the labelled
  demo network. This destroys local accounts, so do not run it mid-demo.

## Avoid during the demo

- **Delete this account** in Settings is irreversible and removes the persona.
- **Seed demo data into my account** on a persona that is already seeded adds a
  second 47-record dataset (a different dataset, not a duplicate of the first).
  On a freshly registered account it is idempotent: repeat clicks import zero.
- **Disconnect** keeps imported evidence; reconnecting means re-seeding.

## Verification status

`pnpm typecheck`, `pnpm test` (41/41), and `pnpm build` pass. Login for all five
accounts, profile save, evidence visibility, certificate issuance and detail,
pairing token, sync, consent revoke/grant, and data export were exercised against
the running app.
