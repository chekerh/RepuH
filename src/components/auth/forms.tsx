"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button, Field, Input } from "@/components/ui";

function extractError(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const maybe = payload as { error?: { message?: string } };
  return maybe.error?.message ?? null;
}

/** Field-level messages from Zod's flatten(), keyed by field name. */
function extractFieldErrors(payload: unknown): Record<string, string> {
  if (!payload || typeof payload !== "object") return {};
  const details = (payload as { error?: { details?: { fieldErrors?: Record<string, string[]> } } })
    .error?.details?.fieldErrors;
  if (!details || typeof details !== "object") return {};
  const out: Record<string, string> = {};
  for (const [field, messages] of Object.entries(details)) {
    const first = Array.isArray(messages) ? messages[0] : undefined;
    if (typeof first === "string" && first) out[field] = first;
  }
  return out;
}

export interface DemoAccount {
  email: string;
  name: string;
  persona: string;
  password: string;
}

export function LoginForm({ demoAccounts = [] }: { demoAccounts?: DemoAccount[] }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: String(form.get("email") ?? ""),
          password: String(form.get("password") ?? ""),
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setError(extractError(payload) ?? "Sign in failed. Try again.");
        return;
      }
      router.push((payload as { next?: string })?.next ?? "/dashboard");
      router.refresh();
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <div>
        <h1 className="display text-4xl">Sign in</h1>
        <p className="mt-2 text-sm text-muted">
          Your fingerprint, evidence and privacy controls are waiting.
        </p>
      </div>

      <Field label="Email" htmlFor="email">
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </Field>

      <Field label="Password" htmlFor="password">
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="••••••••••"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </Field>

      {error ? (
        <p role="alert" className="rounded-sm border border-danger/30 bg-danger/5 px-3 py-2 text-xs text-danger">
          {error}
        </p>
      ) : null}

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? <Loader2 size={16} className="animate-spin" /> : null}
        {pending ? "Signing in" : "Sign in"}
        {!pending ? <ArrowRight size={16} /> : null}
      </Button>

      <div className="flex items-center justify-between text-xs">
        <Link href="/forgot-password" className="text-muted hover:text-foreground">
          Forgot your password?
        </Link>
        <Link href="/register" className="font-medium text-primary hover:underline">
          Create an account
        </Link>
      </div>

      {demoAccounts.length > 0 ? (
        <section aria-labelledby="demo-accounts" className="border-t border-border pt-4">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="demo-accounts" className="label">
              Demo accounts
            </h2>
            <span className="text-[0.625rem] font-semibold tracking-wide text-warning">
              LABELLED DEMO DATA
            </span>
          </div>
          <p className="mt-1 text-[0.6875rem] leading-relaxed text-muted">
            Seeded by the development adapter. Pick one to fill the form; every record in these
            accounts carries a DEMO badge.
          </p>
          <ul className="mt-2 divide-y divide-border border-y border-border">
            {demoAccounts.map((account) => (
              <li key={account.email}>
                <button
                  type="button"
                  onClick={() => {
                    setEmail(account.email);
                    setPassword(account.password);
                    setError(null);
                  }}
                  className="flex w-full items-center justify-between gap-3 py-2 text-left transition-colors hover:bg-surface-muted"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-medium">{account.name}</span>
                    <span className="block truncate text-[0.6875rem] text-muted">
                      {account.persona} · {account.email}
                    </span>
                  </span>
                  <span className="shrink-0 text-[0.6875rem] font-medium text-primary">Use</span>
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[0.6875rem] text-muted">
            Password for all accounts: <code className="font-mono text-foreground">{demoAccounts[0]?.password}</code>
          </p>
        </section>
      ) : null}
    </form>
  );
}

export function RegisterForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setFieldErrors({});
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          displayName: String(form.get("displayName") ?? ""),
          email: String(form.get("email") ?? ""),
          password: String(form.get("password") ?? ""),
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        // The 422 carries per-field messages. They are shown on the fields
        // themselves so the summary is never the only signal — a screen-reader
        // user is told which field failed, not just that one did.
        const fields = extractFieldErrors(payload);
        setFieldErrors(fields);
        setError(extractError(payload) ?? "Could not create the account.");
        return;
      }
      router.push("/onboarding");
      router.refresh();
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <div>
        <h1 className="display text-4xl">Create your identity</h1>
        <p className="mt-2 text-sm text-muted">
          No test, no challenge, no score to grind. The account starts empty and honest.
        </p>
      </div>

      <Field
        label="What should we call you?"
        htmlFor="displayName"
        error={fieldErrors.displayName}
      >
        <Input
          id="displayName"
          name="displayName"
          autoComplete="name"
          required
          minLength={2}
          placeholder="Ada Lovelace"
          aria-invalid={fieldErrors.displayName ? true : undefined}
          aria-describedby={fieldErrors.displayName ? "displayName-error" : undefined}
        />
      </Field>

      <Field label="Email" htmlFor="email" error={fieldErrors.email}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
          aria-invalid={fieldErrors.email ? true : undefined}
          aria-describedby={fieldErrors.email ? "email-error" : undefined}
        />
      </Field>

      <Field
        label="Password"
        htmlFor="password"
        hint="10 characters minimum"
        error={fieldErrors.password}
      >
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={10}
          placeholder="Choose a strong password"
          aria-invalid={fieldErrors.password ? true : undefined}
          aria-describedby={fieldErrors.password ? "password-error" : undefined}
        />
      </Field>

      {error ? (
        <p role="alert" className="rounded-sm border border-danger/30 bg-danger/5 px-3 py-2 text-xs text-danger">
          {error}
        </p>
      ) : null}

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? <Loader2 size={16} className="animate-spin" /> : null}
        {pending ? "Creating account" : "Create your identity"}
        {!pending ? <ArrowRight size={16} /> : null}
      </Button>

      <p className="text-[0.6875rem] leading-relaxed text-muted">
        By creating an account you accept the{" "}
        <Link href="/terms" className="underline underline-offset-2">
          terms
        </Link>{" "}
        and the{" "}
        <Link href="/privacy" className="underline underline-offset-2">
          privacy model
        </Link>
        . Email verification has no mail provider configured in this MVP; that is stated in the
        documentation rather than simulated.
      </p>

      <p className="text-xs text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}

export function RecoveryForm() {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setMessage(null);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: String(form.get("email") ?? "") }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setError(extractError(payload) ?? "Could not submit the request.");
        return;
      }
      setMessage(
        (payload as { message?: string })?.message ??
          "If an account exists for that address, a recovery link has been queued.",
      );
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <div>
        <h1 className="display text-4xl">Recover access</h1>
        <p className="mt-2 text-sm text-muted">
          Enter the address on the account. The response is the same whether or not it exists.
        </p>
      </div>

      <Field label="Email" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required placeholder="you@example.com" />
      </Field>

      {message ? (
        <p className="rounded-sm border border-accent/30 bg-accent-soft px-3 py-2 text-xs text-accent">
          {message}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="rounded-sm border border-danger/30 bg-danger/5 px-3 py-2 text-xs text-danger">
          {error}
        </p>
      ) : null}

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? <Loader2 size={16} className="animate-spin" /> : null}
        {pending ? "Submitting" : "Send recovery link"}
      </Button>

      <p className="text-xs text-muted">
        <Link href="/login" className="font-medium text-primary hover:underline">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
