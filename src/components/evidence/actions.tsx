"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Flag, Loader2 } from "lucide-react";
import { Button, Select } from "@/components/ui";

type Visibility = "private" | "public" | "selective";

export function EvidenceActions({
  evidenceId,
  visibility,
  verificationState,
}: {
  evidenceId: string;
  visibility: Visibility;
  verificationState: "provisional" | "corroborated" | "disputed";
}) {
  const router = useRouter();
  const [value, setValue] = useState<Visibility>(visibility);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reporting, setReporting] = useState(false);
  const [reason, setReason] = useState("incorrect_attribution");

  async function changeVisibility(next: Visibility) {
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/evidence/${evidenceId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ visibility: next }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setError(payload?.error?.message ?? "Could not change visibility.");
        setValue(visibility);
        return;
      }
      setValue(next);
      setMessage(next === "private" ? "Now private." : `Now ${next}.`);
      router.refresh();
    } catch {
      setError("Network error. Try again.");
      setValue(visibility);
    } finally {
      setPending(false);
    }
  }

  async function submitReport() {
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/evidence/${evidenceId}/report`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setError(payload?.error?.message ?? "Could not file the report.");
        return;
      }
      setMessage(payload?.message ?? "Marked as disputed.");
      setReporting(false);
      router.refresh();
    } catch {
      setError("Network error. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor={`visibility-${evidenceId}`} className="sr-only">
          Visibility for this evidence
        </label>
        <Select
          id={`visibility-${evidenceId}`}
          value={value}
          disabled={pending || verificationState === "disputed"}
          onChange={(event) => {
            const next = event.target.value as Visibility;
            setValue(next);
            void changeVisibility(next);
          }}
          className="h-8 w-auto min-w-[8.5rem] py-0 text-xs"
        >
          <option value="private">Private</option>
          <option value="selective">Selective</option>
          <option value="public">Public</option>
        </Select>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setReporting((current) => !current)}
          disabled={pending || verificationState === "disputed"}
          className="text-xs"
        >
          {pending ? <Loader2 size={12} className="animate-spin" /> : <Flag size={12} />}
          {verificationState === "disputed" ? "Disputed" : "Report"}
        </Button>
      </div>

      {reporting ? (
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor={`reason-${evidenceId}`} className="sr-only">
            Report reason
          </label>
          <Select
            id={`reason-${evidenceId}`}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            className="h-8 w-auto py-0 text-xs"
          >
            <option value="incorrect_attribution">Incorrect attribution</option>
            <option value="not_my_work">Not my work</option>
            <option value="misclassified_skill">Misclassified capability</option>
            <option value="outdated">Outdated</option>
            <option value="other">Other</option>
          </Select>
          <Button type="button" size="sm" variant="secondary" onClick={submitReport} disabled={pending}>
            Confirm report
          </Button>
        </div>
      ) : null}

      {message ? <p className="text-[0.6875rem] text-accent">{message}</p> : null}
      {error ? (
        <p role="alert" className="text-[0.6875rem] text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
