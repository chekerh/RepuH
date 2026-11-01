# Agent conventions — RepuH

## Commands

```bash
pnpm install
pnpm dev              # http://localhost:3000
pnpm typecheck        # must pass
pnpm test             # 26 unit tests, must pass
pnpm build            # must pass
pnpm extension:build  # → apps/extension/dist
pnpm hedera:setup     # preflight + topic creation (needs operator credentials)
```

Do not add a test runner. Tests use `node:test` via `tsx`, imported with the
`.ts` extension (allowed by `allowImportingTsExtensions`).

## Architectural rules

- `src/lib/ontology`, `src/lib/evidence`, `src/lib/scoring` and
  `src/lib/integrity` are **pure**. No database, network, `process.env`, or
  `new Date()` inside a calculation — the clock is injected as `now`.
- Only `src/lib/db` touches SQLite. No SQL in pages or components.
- Route handlers validate with Zod, resolve the actor, then delegate. No scoring
  or classification logic in a route.
- Every mutation calls `assertSameOrigin()` and is rate limited.
- Every personalised query takes `userId` as its first argument.
- Public data is a **projection built from a filtered query**, never a filter
  applied while serialising.

## Product rules (non-negotiable)

1. **No tests, quizzes, challenges or timed assessments.** Evidence comes from
   attributable work.
2. **No composite score.** Never add an "overall" number.
3. **No number without confidence and limitations.** An estimate of `null` means
   "not established"; never render it as `0`.
4. **Unconfigured capabilities state that they are unavailable.** Never simulate
   a connection, a transaction, an email or a verification.
5. **Demo data is labelled.** `is_demo = 1` and a visible DEMO badge. It never
   mixes into a real account.
6. **Limitations are shown where claims are shown**, not buried in a policy page.
7. **`confirmed` requires a receipt.** Never mark a batch or certificate anchored
   to Hedera without a topic sequence number from the network.
8. **A certificate is a record, not a grade.** Its estimate, confidence and
   limitations travel together; the signature covers all of them.

## Design rules

- Colours come from CSS tokens in `src/app/globals.css`. No raw hex outside that
  file.
- Hairlines and typography carry structure; avoid stacked rounded cards.
- Motion must collapse under `prefers-reduced-motion`.
- Icon-only controls need `aria-label`; status needs text, not colour alone.
- Server components by default; add `"use client"` only for interaction.

## Style

- TypeScript strict, `noUncheckedIndexedAccess`. No `any`, no non-null assertion
  to silence a real check, no `@ts-ignore`.
- Comments explain *why*, especially where a decision trades one risk for
  another.
- Copy is direct and specific: no "revolutionary", "unlock", "10x", "AI-powered"
  as a selling point.
- Errors are typed and safe: no stack traces, tokens, payloads or emails in a
  response.

## When changing scoring or classification

- Bump `ALGORITHM_VERSION` for any behavioural change to scoring.
- Add or update a unit test that would fail on the old behaviour.
- Update `docs/SCORING.md` in the same change.
- Old `skill_snapshots` rows become historical; never rewrite them.

## When changing certificate or anchoring payloads

- Bump the payload version and update `docs/HEDERA.md` or
  `docs/CERTIFICATES.md`.
- Add a test that pins the envelope fields and the 1024-byte limit.
- Old signatures must remain verifiable; do not change canonicalisation.

## When changing the schema

- Update `src/lib/db/schema.ts` **and** `docs/DATA_MODEL.md`.
- Keep Postgres-compatible shapes (no SQLite-only types).
- Add a cascade rule for user-owned data.
- Consider what deletion must remove and what is irreversible (anchors).

## Do not

- Add analytics, third-party scripts or CORS.
- Store raw provider tokens; encrypt at rest.
- Log secrets, cookies or payloads.
- Commit `.env*`, `data/`, or an unlabelled fixture that looks like real data.
- Deploy or publish without an explicit request.
