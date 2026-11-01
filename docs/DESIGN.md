# Design system

The brief's aesthetic: **editorial fintech** — a research publication that
happens to be an application. Structure comes from hairlines and typographic
hierarchy, not from stacked rounded cards and drop shadows.

## Principles

1. **Evidence is the visual subject.** Numbers are set in display type with their
   confidence adjacent. A figure is never shown alone.
2. **Hairlines, not boxes.** `.rule` dividers and unshadowed surfaces separate
   content. Cards are used only where an object genuinely is a bounded thing
   (a skill drawer, an evidence row).
3. **Restrained colour.** One primary blue, one teal accent for integrity
   states, and status colours used only as status.
4. **Motion discloses, never decorates.** The lattice rotates slowly; panels
   rise 10px on mount. Everything collapses under `prefers-reduced-motion`.
5. **Honest empty states.** "Not yet established" is a designed state, not a
   missing one.

## Tokens

Defined once in `src/app/globals.css` and exposed to Tailwind v4 via `@theme`.

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `--background` | `#f7f8fa` | `#0b0f16` | Page |
| `--surface` | `#ffffff` | `#111826` | Raised object |
| `--surface-muted` | `#f0f2f5` | `#18202f` | Wells, skeletons |
| `--foreground` | `#151c2c` | `#edf1f7` | Text |
| `--muted` | `#687386` | `#98a4b8` | Secondary text |
| `--primary` | `#285bdb` | `#7c9dff` | Actions, links |
| `--accent` | `#16a085` | `#35d3ae` | Integrity / verified |
| `--border` | `#e4e8ef` | `#232d3d` | Hairlines |
| `--success` / `--warning` / `--danger` | `#158a66` / `#c58b30` / `#c64d54` | lighter | Status only |

Radii are deliberately small: `3 / 5 / 8 / 12px`. Nothing is pill-shaped except
status chips.

## Type

- **Display** — Instrument Serif, weight 400, tracking `-0.028em`, line-height
  `0.98`. Used for page titles, hero statements and large numerals.
- **Sans** — Inter, with `cv02/cv03/cv04/cv11` features. Body copy at 14–16px.
- **Mono** — system monospace for hashes, proofs, ids and code.

`.label` is the workhorse metadata style: 11px, uppercase, `0.09em` tracking,
muted. Every metric has one.

## Layout

- Marketing pages: 12-column grid capped at 1200px, generous vertical rhythm
  (96–140px between sections), a faint 56px grid in hero areas.
- App pages: fixed 232px sidebar above `lg`, content max 1080px, sticky page
  header with actions on the right.
- Public profile: single editorial column at 720px with a wide metric band.

## Components

`src/components/ui.tsx` is the whole primitive set: `Button`, `Input`,
`Textarea`, `Select`, `Field`, `Badge`, `StatusDot`, `Card`, `Stat`,
`ProgressBar`, `EmptyState`, `Skeleton`, `Tabs`, `Alert`, `Tooltip`. Variants are
explicit; there is no styling API beyond `variant`, `size` and `className`.

Feature components:

| Component | Surface |
| --- | --- |
| `lattice.tsx` | 3D capability lattice + 2D fallback |
| `fingerprint/explorer.tsx` | Fingerprint list and skill drawer |
| `evidence/actions.tsx` | Visibility, dispute, retract |
| `integrations/panel.tsx` | Provider connection, sync, demo seed |
| `settings/controls.tsx` | Preferences, consent, export, deletion |
| `onboarding/wizard.tsx` | Four-step onboarding |
| `extension/pairing.tsx` | Token creation and install steps |
| `theme-toggle.tsx` | Light / dark / system |

## The 3D lattice

React Three Fiber renders capability nodes on three concentric shells by
confidence band, with edges between related skills. Node radius encodes
confidence, not the estimate, so a high number with low confidence does not read
as certainty.

Behaviour:

- One instanced node per ontology skill (35 today); instanced meshes, no per-node lights.
- `frameloop="demand"` with a slow group rotation; pauses when the canvas is
  off-screen via `IntersectionObserver`, and stops entirely under
  `prefers-reduced-motion`.
- DPR capped at 1.75; antialiasing off on low-power devices.
- Fallback: if WebGL context creation fails, a deterministic 2D SVG projection
  renders the same data with the same labels. No data is 3D-only.
- Keyboard users get the full fingerprint list; the canvas is `aria-hidden` and
  every skill is reachable in the adjacent list.

## Accessibility

- All interactive elements are real `button`/`a`/`input` elements.
- Visible `:focus-visible` ring at 2px with 2px offset, never removed.
- Contrast: body text ≥ 7:1, muted ≥ 4.6:1 on both themes (measured against the
  token pairs above).
- Every icon-only control has an `aria-label`; status is conveyed by text as well
  as colour.
- Reduced motion disables transitions, the lattice rotation and smooth scroll.
- The skill drawer traps focus, closes on `Escape`, and restores focus on close.
- Forms use `<label for>`, inline errors linked with `aria-describedby`, and
  `aria-live="polite"` for submission results.

## Responsive

Breakpoints follow Tailwind defaults. Checked widths: 360, 390, 768, 1024, 1440,
1920. No horizontal overflow at 360px; tables become stacked definition lists
below `md`; the sidebar becomes a sheet below `lg`.

## Copy

Direct, specific, no superlatives. The product states limitations in the same
voice it states abilities. Nothing says "revolutionary", "10x", "unlock your
potential" or "AI-powered" as a selling point.
