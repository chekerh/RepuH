"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Loader2, Plug, ShieldAlert } from "lucide-react";
import { Badge, Button } from "@/components/ui";

interface ChromeLike {
  runtime?: {
    sendMessage?: (
      extensionId: string,
      message: unknown,
      callback?: (response: unknown) => void,
    ) => void;
    lastError?: { message?: string };
  };
}

export function ExtensionPairing() {
  const [extensionId, setExtensionId] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [delivered, setDelivered] = useState<"unknown" | "sent" | "manual">("unknown");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    // The query string only exists after mount. Reading it during render would
    // make the server and client markup disagree, so the value is adopted here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setExtensionId(params.get("ext") ?? "");
  }, []);

  async function pair() {
    setPending(true);
    setError(null);
    setToken(null);
    setDelivered("unknown");
    try {
      const response = await fetch("/api/extension/token", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ label: "Chrome extension" }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setError(payload?.error?.message ?? "Could not create a pairing token.");
        return;
      }
      const nextToken = payload.token as string;
      setToken(nextToken);

      const chrome = (window as unknown as { chrome?: ChromeLike }).chrome;
      if (extensionId && chrome?.runtime?.sendMessage) {
        try {
          chrome.runtime.sendMessage(
            extensionId,
            { type: "REPUH_PAIR", token: nextToken, appUrl: window.location.origin },
            () => {
              const failure = chrome.runtime?.lastError;
              setDelivered(failure ? "manual" : "sent");
            },
          );
        } catch {
          setDelivered("manual");
        }
      } else {
        setDelivered("manual");
      }
    } catch {
      setError("Network error. No token was created.");
    } finally {
      setPending(false);
    }
  }

  async function copy() {
    if (!token) return;
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("Clipboard access was refused. Select the token and copy it manually.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-sm border border-border bg-surface p-4">
        <p className="text-[0.8125rem] font-medium">Pairing</p>
        <p className="mt-1 max-w-[58ch] text-[0.8125rem] leading-relaxed text-muted">
          The browser companion uses a short-lived bearer token, hashed at rest, instead of your
          session cookie. Nothing is shared until you press the button.
        </p>

        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div className="w-full max-w-xs">
            <label htmlFor="extension-id" className="label">
              Extension ID (optional)
            </label>
            <input
              id="extension-id"
              value={extensionId}
              onChange={(event) => setExtensionId(event.target.value.trim())}
              placeholder="abcdefghijklmnop…"
              className="mt-1 h-9 w-full rounded-sm border border-border-strong bg-surface px-2.5 font-mono text-xs"
            />
          </div>
          <Button type="button" size="sm" onClick={pair} disabled={pending}>
            {pending ? <Loader2 size={13} className="animate-spin" /> : <Plug size={13} />}
            {pending ? "Creating token" : "Create pairing token"}
          </Button>
        </div>

        {token ? (
          <div className="mt-4 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              {delivered === "sent" ? (
                <Badge tone="success">Sent to the extension</Badge>
              ) : (
                <Badge tone="warning">Copy this into the extension popup</Badge>
              )}
              <Button type="button" size="sm" variant="secondary" onClick={copy}>
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? "Copied" : "Copy token"}
              </Button>
            </div>
            <code className="block break-all rounded-xs border border-border bg-surface-muted p-2.5 font-mono text-[0.6875rem] leading-relaxed">
              {token}
            </code>
            <p className="text-[0.6875rem] text-muted">
              The raw token is shown once. It expires in 30 days and can be revoked by deleting the
              account or issuing a new pairing.
            </p>
          </div>
        ) : null}

        {delivered === "manual" && extensionId ? (
          <p className="mt-3 flex items-start gap-2 text-[0.6875rem] text-warning">
            <ShieldAlert size={12} className="mt-0.5 shrink-0" />
            The page could not reach the extension (it may not be loaded, or the ID is wrong). Use the
            copy fallback.
          </p>
        ) : null}

        {error ? (
          <p role="alert" className="mt-3 text-[0.6875rem] text-danger">
            {error}
          </p>
        ) : null}
      </div>

      <div className="border-t border-border pt-5">
        <h2 className="text-[0.9375rem] font-medium">What the companion may observe</h2>
        <ul className="mt-2 space-y-1.5 text-[0.8125rem] leading-relaxed text-muted">
          <li>Allowlisted professional documentation domains only.</li>
          <li>Domain, page title, timestamp and time on page.</li>
          <li>Nothing at all while browser observation consent is absent or revoked.</li>
        </ul>
        <p className="mt-3 text-[0.8125rem] font-medium">What it never observes</p>
        <ul className="mt-2 space-y-1.5 text-[0.8125rem] leading-relaxed text-muted">
          <li>Keystrokes, clipboard contents, passwords or form values.</li>
          <li>Private messages, email, banking, health or unrelated browsing history.</li>
          <li>Screenshots, cookies from other sites, or full page content.</li>
        </ul>
      </div>
    </div>
  );
}
