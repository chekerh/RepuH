# Scoring

The engine is a pure function in `src/lib/scoring/index.ts`, versioned
`scoring-1.0.0`. Same inputs plus the same version always produce the same
estimate, so any published number can be recomputed from its contributions.

It never returns a bare number. Every estimate travels with its confidence, its
status, its contributions, its rationale and its limitations.

## Inputs

One `EvidenceInput` per attributable evidence item:

| Field | Meaning |
| --- | --- |
| `signal` | One of eight ontology signals |
| `occurredAt` | When the underlying work happened |
| `quality` | 0–1, produced by the classifier from observable metadata |
| `skills` | Skill ids mapped by explicit rules |
| `projects` | Project references, for corroboration only |
| `sources` | `github`, `extension`, `manual` |
| `visibility` | Used only by the public projection, not by scoring |

## Step 1 — effective contribution

```
effective = baseWeight × quality × recency
recency   = 0.5 ^ (ageDays / 180)
```

`baseWeight` comes from the ontology and is deliberately small:

| Signal | Weight | What it can support |
| --- | --- | --- |
| Merged pull request | 1.00 | a completed, reviewed contribution |
| Code review | 0.60 | participation in review |
| Release | 0.55 | a shipped version |
| Documentation | 0.50 | written explanation |
| Commit series | 0.42 | sustained activity |
| Issue resolution | 0.40 | diagnosis and fix of a reported problem |
| Repository | 0.18 | an attributable body of work exists |
| Observed session | 0.12 | permitted browsing in a declared tool |

A skill only accepts signals its ontology entry declares credible. A commit
series cannot speak to `distributed-systems`, for example.

## Step 2 — corroboration, then a cap

```
projectCredit = 1 + 0.14 × min(3, projects − 1)
sourceCredit  = 1 + 0.09 × min(2, sources  − 1)
weighted      = Σ effective × projectCredit × sourceCredit
volumeCap     = 2.4 + 1.2 × projects + 0.5 × sources
capped        = min(weighted, volumeCap)
```

The cap is the important part. Forty merged pull requests inside one project
cannot outrank ten spread across three projects, because volume in a single
context is exactly the pattern that inflates activity into apparent competence.
When the cap binds, the rationale says so explicitly.

## Step 3 — estimate

```
estimate = 100 × (1 − e^(−capped / 3.4))
```

Saturating, not linear: early evidence moves the number, later evidence of the
same kind moves it less. The curve approaches 100 without reaching it.

## Step 4 — sufficiency gate

`estimate` is **null** when:

- there is no matching evidence, or
- there is exactly one item and its signal is not `merged_pull_request`.

A single merged pull request is the only case where one item may open a
provisional read, because the merge itself represents an external review
boundary. Everything else needs corroboration before a number exists. The UI
renders `null` as "not yet established", never as "0".

## Step 5 — confidence

```
spanCredit  = clamp(log10(1 + spanDays/30) / 1.6, 0, 1)
volumeCredit= clamp(0.20 + 0.10×n + 0.06×projects + 0.03×sources
                    + 0.14×spanCredit, 0, 0.95)
confidence  = clamp(volumeCredit × (0.55 + 0.45×meanQuality), 0, 0.95)
```

Confidence rises with count, independent projects, independent sources and the
time span the evidence covers — then is scaled by mean quality. It is capped at
0.95: this system does not issue certainty.

## Step 6 — status

| Status | Condition |
| --- | --- |
| `insufficient` | `estimate === null` |
| `established` | confidence ≥ 0.62 **and** ≥ 4 items **and** ≥ 2 projects |
| `provisional` | anything else with a number |

`established` therefore requires breadth, not just volume.

## Stated limitations attached to every estimate

Generated per skill, not boilerplate:

- The skill's ontology limitation (for example: "Language detection from
  repository metadata only…").
- Single-source evidence → "independent corroboration is unavailable".
- Single-project evidence → "the estimate may reflect that context".
- `provisional` → "AI-assisted classification has not been independently
  corroborated".
- confidence < 0.5 → "treat the estimate as a weak signal".

## What the engine deliberately does not do

- No composite/overall score. There is no single RepuH number to quote.
- No ranking across professions, deployments or time.
- No credit for activity without attribution.
- No inference from repository *names* (rule REPUH-ONTO-002).
- No test, quiz, challenge or timed assessment input — those do not exist.

## Recomputation and audit

Every `skill_snapshots` row stores `algorithm_version`, `inputs` (counts, span,
corroboration) and the resulting estimate. Bumping `ALGORITHM_VERSION` makes old
snapshots visibly historical rather than silently wrong.

To reproduce a number manually:

1. Open the skill drawer — it lists each contribution with base weight, quality,
   recency and effective value.
2. Sum the effective values, apply the corroboration factors, apply the cap.
3. Apply the saturation formula above.

The unit tests in `tests/scoring.test.ts` cover the gate, the cap, monotonicity,
recency decay and determinism.
