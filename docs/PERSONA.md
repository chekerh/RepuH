# RepuH — product persona

The voice is part of the product, not a coat of paint on it. RepuH makes claims
about people's competence, so every claim it makes in its own copy has to be one
it can support. The copy should read like the person the product imitates: an
engineer who has read your work, tells you what it shows, and does not flatter
you.

## Who is speaking

Working name: **the reviewer**.

- Has read the contribution, not just the profile.
- Says what a record supports before saying what it implies.
- Is unimpressed by volume, followers, streaks and launch weeks.
- Never sells. Never apologises for the product being unfinished.
- Answers the reader's actual question: "what does this show about me, and how
  much should I trust it?"

The reviewer does not perform authority. It gives you the method and lets you
check it.

## Audience

Two people share the copy:

1. A software engineer deciding whether to connect a source. They are tired of
   skill quizzes and take-home projects, and they will leave if the first
   paragraph is a pitch.
2. A hiring engineer reading a public profile. They want the evidence and the
   confidence, and they will distrust a page that only shows a number.

Write to both. Neither needs a definition of a pull request.

## Voice rules

- Plain declaratives. Subject, verb, object. Short sentences carry the weight;
  one long sentence per paragraph is enough.
- Specific over grand. "Pull requests, reviews, commits" beats "professional
  activity". "Two evidence items" beats "sufficient signal".
- Claim, then limit. If a capability is estimated, say where the estimate stops.
- State the unavailable thing as unavailable. A missing mail provider, an
  unconfigured Hedera operator, a missing OAuth client: name it.
- Second person for actions ("you connect", "you publish"), third person for the
  system ("RepuH reads", "the interface says").
- Sentence case for headings. Uppercase only for the `.label` micro-type.
- No exclamation marks. No bold for emphasis inside prose.

## What this voice never does

- No composite score language. "Overall", "total reputation", "rank" as a
  personal score.
- No test, quiz, challenge, streak or gamified metaphor.
- No certainty it does not have: "proves your skill", "verified expert",
  "guaranteed".
- No growth copy: "unlock", "10x", "revolutionary", "AI-powered", "seamless".
- No contrast for weight ("not just X, but Y"), no triads padded to three, no
  one-line closers that repeat the paragraph above.
- No em dashes. Commas, colons, full stops or a rewritten sentence.
- No promise of a future feature in product present tense. Say "not configured",
  not "coming soon".

## The shape of a page

1. One claim, stated plainly, in the first heading.
2. The mechanism, in the next paragraph or two.
3. The limit, next to the claim, not in a policy page.
4. The next action, named in a verb: "Connect GitHub", "Read the method",
   "Create your identity".

## Worked examples

| Before | After |
| --- | --- |
| Your fingerprint, evidence and privacy controls are waiting. | Your map, evidence and consent records are where you left them. |
| A living map of demonstrated capability, not a single score. | Categories, skills and the evidence behind each stay separate. There is no overall number to optimise. |
| Continuous intelligence: incremental synchronization keeps the representation current. | Incremental sync keeps the map current. Running it twice adds nothing twice. |
| Decentralized trust: batch roots are anchored to a verifiable commitment. | Batch roots go to Hedera. An anchor proves the record is unchanged. It says nothing about proficiency. |
| No test, no challenge, no score to grind. The account starts empty and honest. | Your account starts empty. It fills only with work you have published. |
| The page may have moved, the profile may be private, or the address may never have existed. Nothing is fabricated to fill the gap. | The page may have moved, the profile may be private, or the address may never have existed. |

## Where the copy lives

- Landing: `src/app/page.tsx`
- Sign in, create account, recovery: `src/components/auth/forms.tsx`
- Auth shell and side panel: `src/app/(auth)/layout.tsx`
- Public marketing pages: `src/app/(marketing)/*`
- Product surfaces: `src/app/(app)/*` and `src/components/*`
- The boot loader's three lines: `src/app/layout.tsx` (`bootMarkup`)

The data, the scoring rules and the interface outrank this document. If a
sentence here promises something the product does not do, the sentence is
wrong.
