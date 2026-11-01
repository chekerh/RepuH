const $ = (id) => document.getElementById(id);

function send(message) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (response) => resolve(response ?? { ok: false }));
  });
}

function formatRelative(value) {
  if (!value) return "Never";
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.round(diff / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

async function render() {
  const status = await send({ type: "REPUH_STATUS" });
  const badge = $("state-badge");

  if (!status.ok) {
    badge.textContent = "Unavailable";
    badge.dataset.tone = "error";
    return;
  }

  $("unpaired").hidden = status.paired;
  $("paired").hidden = !status.paired;
  $("dashboard").href = `${status.appUrl}/activity`;
  $("pair-link").href = `${status.appUrl}/extension`;

  if (!status.paired) {
    badge.textContent = "Not paired";
    badge.dataset.tone = "off";
    return;
  }

  const active = status.enabled;
  badge.textContent = active ? "Observing" : "Paused";
  badge.dataset.tone = active ? "on" : "off";

  $("observation").textContent = active
    ? `Active${status.session ? ` · ${status.session.domain}` : ""}`
    : "Paused";
  $("queue").textContent = `${status.queueDepth} event${status.queueDepth === 1 ? "" : "s"}`;
  $("last-sync").textContent = formatRelative(status.lastSyncAt);
  $("toggle").textContent = active ? "Pause observation" : "Resume observation";

  $("consent").hidden = !status.consentRequired;
  const error = $("error");
  if (status.lastError) {
    error.hidden = false;
    error.textContent = status.lastError;
  } else {
    error.hidden = true;
  }

  const list = $("allowlist");
  list.replaceChildren(
    ...status.allowlist.map((domain) => {
      const item = document.createElement("li");
      item.textContent = domain;
      return item;
    }),
  );
}

$("save").addEventListener("click", async () => {
  const token = $("token").value.trim();
  const appUrl = $("app-url").value.trim().replace(/\/$/, "");
  if (!token) return;
  await send({ type: "REPUH_SET_TOKEN", token, appUrl });
  $("token").value = "";
  await render();
});

$("toggle").addEventListener("click", async () => {
  const status = await send({ type: "REPUH_STATUS" });
  await send({ type: status.enabled ? "REPUH_PAUSE" : "REPUH_RESUME" });
  await render();
});

$("flush").addEventListener("click", async () => {
  await send({ type: "REPUH_FLUSH" });
  await render();
});

$("unpair").addEventListener("click", async () => {
  await send({ type: "REPUH_CLEAR" });
  await render();
});

document.addEventListener("DOMContentLoaded", () => {
  render();
});
