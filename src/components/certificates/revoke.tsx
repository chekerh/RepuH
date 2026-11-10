"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function RevokeCertificateButton({ certificateId }: { certificateId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function revoke() {
    const reason = window.prompt("Reason for revocation (optional):");
    if (reason === null) return;
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/certificates/${certificateId}/revoke`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() || undefined }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setError(payload?.error?.message ?? "The certificate could not be revoked.");
        return;
      }
      router.refresh();
    } catch {
      setError("The certificate could not be revoked.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={revoke}
        disabled={pending}
        className="text-xs font-medium text-danger hover:underline disabled:opacity-50"
      >
        {pending ? "Revoking…" : "Revoke"}
      </button>
      {error ? <span className="text-[0.625rem] text-danger">{error}</span> : null}
    </div>
  );
}
