"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Award, Check, Copy, Loader2 } from "lucide-react";
import { Button, Field, Select } from "@/components/ui";
import type { SkillEstimate } from "@/lib/scoring";

interface IssuableSkill {
  skillId: string;
  name: string;
  estimate: number;
  confidence: number;
  status: SkillEstimate["status"];
}

interface IssuedResult {
  id: string;
  payloadHash: string;
  signature: string;
  anchorStatus: string;
  anchorSequence: number | null;
  anchorTopicId: string | null;
  publicUrl: string | null;
}

export function CertificateIssuer({ skills }: { skills: IssuableSkill[] }) {
  const router = useRouter();
  const [skillId, setSkillId] = useState(skills[0]?.skillId ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<IssuedResult | null>(null);
  const [copied, setCopied] = useState(false);

  const selected = skills.find((skill) => skill.skillId === skillId) ?? null;
  const canIssue = Boolean(selected) && !pending;

  async function issue() {
    if (!skillId) return;
    setPending(true);
    setError(null);
    setResult(null);
    try {
      const response = await fetch("/api/certificates", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ skillId }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setError(payload?.error?.message ?? "The certificate could not be issued.");
        return;
      }
      setResult({
        id: payload.id,
        payloadHash: payload.certificate.payloadHash,
        signature: payload.certificate.signature,
        anchorStatus: payload.certificate.anchorStatus,
        anchorSequence: payload.anchor?.sequenceNumber ?? null,
        anchorTopicId: payload.anchor?.topicId ?? null,
        publicUrl: payload.publicUrl,
      });
      router.refresh();
    } catch {
      setError("Network error. No certificate was issued.");
    } finally {
      setPending(false);
    }
  }

  async function copyLink() {
    if (!result) return;
    const url = `${window.location.origin}/certificate/${result.id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setError("Clipboard access was refused by the browser.");
    }
  }

  if (skills.length === 0) {
    return (
      <div className="border-y border-border py-6">
        <p className="text-[0.8125rem] text-muted">
          No capability has a recorded estimate yet. A certificate is only issued for a capability
          that already has evidence behind it — there is nothing to certify honestly until then.
        </p>
        <a
          href="/integrations"
          className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          Connect a source <ArrowUpRight size={12} />
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 border-y border-border py-4 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <Field label="Capability" htmlFor="certificate-skill">
            <Select
              id="certificate-skill"
              value={skillId}
              onChange={(event) => setSkillId(event.target.value)}
            >
              {skills.map((skill) => (
                <option key={skill.skillId} value={skill.skillId}>
                  {skill.name} — {skill.estimate} · {skill.status}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Button type="button" onClick={issue} disabled={!canIssue}>
          {pending ? <Loader2 size={13} className="animate-spin" /> : <Award size={13} />}
          {pending ? "Signing" : "Issue certificate"}
        </Button>
      </div>

      {selected ? (
        <p className="text-xs leading-relaxed text-muted">
          The certificate captures <strong className="font-medium text-foreground">{selected.name}</strong>{" "}
          at {selected.estimate} with {Math.round(selected.confidence * 100)}% confidence, current
          limitations included. It is signed with the deployment&apos;s Ed25519 key; if Hedera is
          configured, the certificate hash is also submitted to the consensus service.
        </p>
      ) : null}

      {error ? (
        <p role="alert" className="border-l-2 border-danger pl-3 text-[0.8125rem] text-danger">
          {error}
        </p>
      ) : null}

      {result ? (
        <div className="space-y-3 border border-border p-4">
          <p className="flex items-center gap-2 text-[0.8125rem] font-medium">
            <Check size={14} className="text-success" />
            Certificate issued
            <span className="font-mono text-[0.6875rem] font-normal text-muted">{result.id}</span>
          </p>
          <p className="break-all font-mono text-[0.625rem] text-muted">hash {result.payloadHash}</p>
          <p className="break-all font-mono text-[0.625rem] text-muted">
            signature {result.signature.slice(0, 44)}…
          </p>
          <p className="text-xs text-muted">
            Anchor:{" "}
            {result.anchorStatus === "confirmed"
              ? `Hedera consensus, topic ${result.anchorTopicId}, sequence ${result.anchorSequence}`
              : result.anchorStatus === "failed"
                ? "the Hedera submission failed; the signature is still verifiable"
                : "not anchored — Hedera is not configured in this deployment"}
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <a
              href={`/certificate/${result.id}`}
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              Open certificate <ArrowUpRight size={12} />
            </a>
            <a
              href={`/api/certificates/${result.id}?download=1`}
              className="text-xs text-muted underline underline-offset-2 hover:text-foreground"
            >
              Download JSON
            </a>
            <button
              type="button"
              onClick={copyLink}
              className="inline-flex items-center gap-1 rounded-xs border border-border px-2 py-1 text-[0.6875rem] text-muted hover:text-foreground"
            >
              {copied ? <Check size={11} /> : <Copy size={11} />}
              {copied ? "Copied" : "Copy share link"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
