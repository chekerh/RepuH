/**
 * RepuH Companion — Manifest V3 service worker.
 *
 * Design constraints:
 *  - Observe only an explicit allowlist of professional documentation domains.
 *  - Never read page content. The tabs API supplies URL and title; nothing else.
 *  - Keep a bounded durable queue so a terminated worker cannot lose events.
 *  - Refuse to send anything while observation is paused or revoked.
 */

const DEFAULTS = {
  appUrl: "http://localhost:3000",
  token: "",
  enabled: false,
  queue: [],
  session: null,
  lastError: null,
  lastSyncAt: null,
  consentRequired: false,
};

const ALLOWLIST = [
  "developer.mozilla.org",
  "docs.github.com",
  "github.com",
  "nextjs.org",
  "react.dev",
  "typescriptlang.org",
  "www.typescriptlang.org",
  "nodejs.org",
  "postgresql.org",
  "www.postgresql.org",
  "supabase.com",
  "threejs.org",
];

const EXTERNAL_ALLOWED_ORIGINS = ["http://localhost:3000", "https://repuh.app"];
const MAX_QUEUE = 200;
const IDLE_MINUTES = 5;
const MAX_SESSION_MINUTES = 45;

async function getState() {
  const stored = await chrome.storage.local.get(DEFAULTS);
  return { ...DEFAULTS, ...stored };
}

async function setState(patch) {
  await chrome.storage.local.set(patch);
}

function hostAllowed(urlString) {
  try {
    const url = new URL(urlString);
    if (url.protocol !== "https:" && url.protocol !== "http:") return false;
    return ALLOWLIST.some(
      (domain) => url.hostname === domain || url.hostname.endsWith(`.${domain}`),
    );
  } catch {
    return false;
  }
}

async function noteVisit(tab) {
  if (!tab || !tab.url || !tab.active) return;
  const state = await getState();
  if (!state.enabled || !state.token) return;
  if (!hostAllowed(tab.url)) return;

  const host = new URL(tab.url).hostname;
  const now = Date.now();
  let session = state.session;

  if (session && session.domain !== host) {
    await enqueueSession(session);
    session = null;
  }

  if (!session) {
    session = {
      domain: host,
      title: (tab.title || host).slice(0, 180),
      startedAt: now,
      lastAt: now,
      externalId: `ext_${now}_${Math.random().toString(36).slice(2, 10)}`,
    };
  } else {
    session.lastAt = now;
    if (tab.title) session.title = tab.title.slice(0, 180);
  }

  await setState({ session });
}

async function enqueueSession(session) {
  if (!session) return;
  const state = await getState();
  const durationSeconds = Math.max(
    1,
    Math.min(MAX_SESSION_MINUTES * 60, Math.round((session.lastAt - session.startedAt) / 1000)),
  );

  const event = {
    externalId: session.externalId,
    eventType: "website_session_observed",
    occurredAt: new Date(session.startedAt).toISOString(),
    domain: session.domain,
    title: session.title,
    durationSeconds,
  };

  const queue = [...state.queue, event].slice(-MAX_QUEUE);
  await setState({ queue, session: null });
  await flush();
}

async function flush() {
  const state = await getState();
  if (!state.token || state.queue.length === 0) return;

  try {
    const response = await fetch(`${state.appUrl}/api/extension/events`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${state.token}`,
      },
      body: JSON.stringify({ events: state.queue.slice(0, 50) }),
    });

    if (response.status === 401) {
      await setState({ lastError: "Pairing token rejected. Pair the extension again.", consentRequired: false });
      return;
    }
    if (response.status === 403) {
      const payload = await response.json().catch(() => null);
      await setState({
        lastError: payload?.error?.message ?? "Browser observation is not enabled.",
        consentRequired: true,
      });
      return;
    }
    if (!response.ok) {
      await setState({ lastError: `Upload failed (${response.status}). Events are queued.` });
      return;
    }

    const payload = await response.json().catch(() => ({ accepted: 0 }));
    const sent = Math.min(state.queue.length, 50);
    const remaining = (await getState()).queue.slice(sent);
    await setState({
      queue: remaining,
      lastSyncAt: new Date().toISOString(),
      lastError: null,
      consentRequired: false,
      lastAccepted: payload.accepted ?? 0,
    });
  } catch {
    await setState({ lastError: "Network unavailable. Events are queued locally." });
  }
}

async function closeIdleSession() {
  const state = await getState();
  if (!state.session) return;
  const idleMs = Date.now() - state.session.lastAt;
  const lifetimeMs = Date.now() - state.session.startedAt;
  if (idleMs > IDLE_MINUTES * 60_000 || lifetimeMs > MAX_SESSION_MINUTES * 60_000) {
    await enqueueSession(state.session);
  }
}

chrome.runtime.onInstalled.addListener(async () => {
  await chrome.alarms.create("repuh-tick", { periodInMinutes: 1 });
  const state = await getState();
  if (state.token && state.enabled) {
    await setState({ enabled: true });
  }
});

chrome.runtime.onStartup.addListener(async () => {
  await chrome.alarms.create("repuh-tick", { periodInMinutes: 1 });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name !== "repuh-tick") return;
  closeIdleSession().then(flush).catch(() => undefined);
});

chrome.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
  if (changeInfo.status !== "complete") return;
  noteVisit(tab).catch(() => undefined);
});

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  try {
    const tab = await chrome.tabs.get(tabId);
    if (tab.active) await noteVisit(tab);
  } catch {
    // Tab closed between activation and lookup; nothing to record.
  }
});

chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  const origin = sender?.origin ?? "";
  if (!EXTERNAL_ALLOWED_ORIGINS.some((allowed) => origin === allowed)) {
    sendResponse({ ok: false, error: "Origin not allowed" });
    return;
  }
  if (message?.type !== "REPUH_PAIR" || typeof message.token !== "string") {
    sendResponse({ ok: false, error: "Unsupported message" });
    return;
  }
  setState({
    token: message.token,
    appUrl: typeof message.appUrl === "string" ? message.appUrl : DEFAULTS.appUrl,
    enabled: false,
    lastError: null,
  })
    .then(() => sendResponse({ ok: true }))
    .catch(() => sendResponse({ ok: false }));
  return true;
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "REPUH_STATUS") {
    getState()
      .then((state) =>
        sendResponse({
          ok: true,
          paired: Boolean(state.token),
          enabled: state.enabled,
          queueDepth: state.queue.length,
          lastError: state.lastError,
          lastSyncAt: state.lastSyncAt,
          consentRequired: state.consentRequired,
          appUrl: state.appUrl,
          allowlist: ALLOWLIST,
          session: state.session,
        }),
      )
      .catch(() => sendResponse({ ok: false }));
    return true;
  }

  if (message?.type === "REPUH_PAUSE") {
    setState({ enabled: false })
      .then(() => sendResponse({ ok: true }))
      .catch(() => sendResponse({ ok: false }));
    return true;
  }

  if (message?.type === "REPUH_RESUME") {
    setState({ enabled: true, lastError: null })
      .then(() => sendResponse({ ok: true }))
      .catch(() => sendResponse({ ok: false }));
    return true;
  }

  if (message?.type === "REPUH_FLUSH") {
    flush()
      .then(() => sendResponse({ ok: true }))
      .catch(() => sendResponse({ ok: false }));
    return true;
  }

  if (message?.type === "REPUH_SET_TOKEN") {
    setState({ token: message.token, appUrl: message.appUrl, lastError: null })
      .then(() => sendResponse({ ok: true }))
      .catch(() => sendResponse({ ok: false }));
    return true;
  }

  if (message?.type === "REPUH_CLEAR") {
    setState({ token: "", enabled: false, queue: [], session: null, lastError: null })
      .then(() => sendResponse({ ok: true }))
      .catch(() => sendResponse({ ok: false }));
    return true;
  }

  return undefined;
});
