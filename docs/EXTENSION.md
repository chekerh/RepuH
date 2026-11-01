# Browser companion (Chrome extension)

A Manifest V3 extension that records **which allowlisted documentation domains
you visited and for how long**. It reads no page content, no keystrokes, no
clipboard, no form values and takes no screenshots.

## Build and load

```bash
pnpm extension:build     # → apps/extension/dist
```

1. `chrome://extensions` → enable **Developer mode**.
2. **Load unpacked** → select `apps/extension/dist`.
3. Copy the generated extension id.
4. In the app: **Browser companion** (`/extension`) → create a pairing token.
5. Either paste the token into the popup, or use the app's "deliver token"
   button once the extension id is registered.

The extension is **not published** to the Chrome Web Store and is not
store-review ready (single-purpose justification, screenshots and a privacy
disclosure would be required).

## Manifest

| Field | Value |
| --- | --- |
| `manifest_version` | 3 |
| `minimum_chrome_version` | 116 |
| `permissions` | `storage`, `alarms` |
| `host_permissions` | Ten documentation domains only |
| Background | Module service worker |
| `externally_connectable` | `http://localhost:3000/*`, `https://repuh.app/*` |

Not requested: `<all_urls>`, `tabs` (the active tab's URL/title arrive via the
`tabs.onUpdated`/`onActivated` events under host permissions), `history`,
`scripting`, `webRequest`, `cookies`, `clipboardRead`.

## Allowlist

`developer.mozilla.org`, `docs.github.com`, `github.com`, `nextjs.org`,
`react.dev`, `typescriptlang.org`, `nodejs.org`, `postgresql.org`,
`supabase.com`, `threejs.org`.

The API independently enforces the same allowlist. An event for `example.com` is
discarded server-side with `rejected` counted, even if a modified client sends
it.

## Session model

- A session begins on tab activation or completion for an allowlisted host.
- Changing domains closes the current session and enqueues it.
- Idle for 5 minutes, or a session longer than 45 minutes, closes the session.
- `durationSeconds` is capped at 45 minutes.
- Only the domain, page title (truncated to 180 chars), start time and duration
  are stored. The full URL is not persisted.

## Durability

`chrome.storage.local` holds a bounded queue of 200 events. The worker flushes
on: session close, a 1-minute `alarms` tick, popup "send now", and startup.
Because state lives in storage rather than memory, service-worker termination
loses nothing. A failed upload leaves events queued and surfaces
`lastError`; a network failure never silently drops data.

## Consent gating

Three gates, all required:

1. **Server consent.** `/api/extension/events` returns `403 consent_required`
   unless a `browser_observation` consent record is active. The popup surfaces
   this and links to Settings.
2. **Local pause.** The popup toggles `enabled`; paused means no new sessions are
   created and nothing is sent.
3. **Pairing.** Without a token, `noteVisit` returns immediately.

Revoking consent in Settings stops ingestion immediately even if the extension
is still running and still holds a valid token — the check is server-side.

## Pairing

`POST /api/extension/token` creates a 90-day token, stores only its SHA-256, and
returns the value once. The popup writes it to `chrome.storage.local`.

Cross-origin pairing uses `chrome.runtime.sendMessage(extensionId, {
type: "REPUH_PAIR", token, appUrl })`; the worker validates `sender.origin`
against a fixed list and refuses anything else.

## Popup

Shows: paired state, observation state, queue depth, last error, last sync,
consent prompt, and the allowlist. Actions: pair, pause, resume, send now,
unpair. No analytics.

## What it cannot do

- It cannot see private repositories or local editor activity.
- It cannot infer skill from a page visit. `observation` is the lowest-weight
  signal (0.12) and cannot by itself produce an estimate.
- It cannot attribute a shared machine to a person.
- It does not run on Firefox or Safari.
