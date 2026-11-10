import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, BadgeCheck, Download, ShieldAlert, ShieldCheck } from "lucide-react";
import { Wordmark } from "@/components/brand";
import { Badge } from "@/components/ui";
import { findCertificate } from "@/lib/db/queries";
import { verifyStoredCertificate, verifyCertificateRegistry } from "@/lib/certificates/service";
import { hederaStatus } from "@/lib/hedera/config";
import { readMirrorMessage } from "@/lib/hedera/hcs";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Evidence certificate",
  robots: { index: false, follow: false },
};

interface MirrorCheck {
  checked: boolean;
  matches: boolean;
  reason: string;
}

async function checkMirror(
  topicId: string | null,
  sequence: number | null,
  hash: string,
): Promise<MirrorCheck | null> {
  if (!topicId || sequence === null) return null;
  const message = await readMirrorMessage(topicId, sequence);
  if (!message) {
    return {
      checked: false,
      matches: false,
      reason: "The mirror node could not be read. The stored receipt is unchanged.",
    };
  }
  try {
    const parsed = JSON.parse(message.message) as { hash?: string };
    const matches = parsed.hash === hash;
    return {
      checked: true,
      matches,
      reason: matches
        ? "The message read back from the mirror node matches this certificate's hash."
        : "The mirrored message does not match this certificate.",
    };
  } catch {
    return {
      checked: true,
      matches: false,
      reason: "The mirrored message was not the expected JSON envelope.",
    };
  }
}

export default async function CertificatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const certificate = findCertificate(id);
  if (!certificate) notFound();

  const verification = verifyStoredCertificate(certificate);
  const hedera = hederaStatus();

  if (!verification.ok) {
    return (
      <div className="mx-auto w-full max-w-[46rem] px-4 py-16 sm:px-6">
        <ShieldAlert size={22} className="text-danger" />
        <h1 className="display mt-4 text-3xl">This certificate does not verify</h1>
        <p className="mt-3 text-sm text-muted">{verification.reason}</p>
      </div>
    );
  }

  const registry = await verifyCertificateRegistry(certificate);
  const payload = verification.payload;
  const mirror = await checkMirror(
    certificate.anchorTopicId,
    certificate.anchorSequence,
    certificate.payloadHash,
  );

  const anchorTone =
    certificate.registryContractId || certificate.anchorStatus === "confirmed"
      ? "success"
      : certificate.anchorStatus === "failed"
        ? "danger"
        : "neutral";

  return (
    <div className="min-h-dvh">
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 w-full max-w-[58rem] items-center justify-between px-4 sm:px-6">
          <Wordmark />
          <Link
            href={`/u/${payload.subject.username}`}
            className="inline-flex items-center gap-1 text-xs text-muted hover:text-foreground"
          >
            View profile <ArrowUpRight size={12} />
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[58rem] px-4 py-10 sm:px-6 lg:py-14">
        <div className="flex flex-wrap items-center gap-3">
          <span className="label">Evidence certificate</span>
          <Badge tone="neutral">{payload.v}</Badge>
          <Badge tone={anchorTone}>
            {certificate.registryContractId
              ? "Contract registered"
              : certificate.anchorStatus === "confirmed"
              ? `Hedera ${certificate.anchorNetwork?.replace("hedera-", "") ?? ""} · #${certificate.anchorSequence}`
              : certificate.anchorStatus === "failed"
                ? "Anchor failed"
                : "Not anchored"}
          </Badge>
          {certificate.status === "revoked" || registry.revoked === true ? <Badge tone="danger">Revoked</Badge> : null}
        </div>

        <h1 className="display mt-4 text-[clamp(2.4rem,6vw,4rem)]">{payload.claim.skillName}</h1>
        <p className="mt-3 max-w-[58ch] text-[0.9375rem] leading-relaxed text-muted">
          Issued to{" "}
          <strong className="font-medium text-foreground">{payload.subject.displayName}</strong>{" "}
          <span className="font-mono text-[0.8125rem]">@{payload.subject.username}</span> on{" "}
          {formatDateTime(payload.issuedAt)}.
        </p>

        <section className="mt-9 grid gap-6 border-y border-border py-6 sm:grid-cols-3">
          <div>
            <p className="label">Estimate</p>
            <p className="num mt-1 text-4xl">{payload.claim.estimate}</p>
          </div>
          <div>
            <p className="label">Confidence</p>
            <p className="num mt-1 text-4xl">{Math.round(payload.claim.confidence * 100)}%</p>
          </div>
          <div>
            <p className="label">Status</p>
            <p className="mt-2">
              <Badge tone={payload.claim.status === "established" ? "success" : "warning"}>
                {payload.claim.status}
              </Badge>
            </p>
            <p className="mt-1.5 text-[0.6875rem] text-muted">
              {payload.claim.evidenceCount} items · {payload.claim.projectCount} projects ·{" "}
              {payload.claim.sourceCount} sources
            </p>
          </div>
        </section>

        <section className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="space-y-7">
            <div>
              <h2 className="text-[0.9375rem] font-medium">What is certified</h2>
              <p className="mt-2 text-[0.8125rem] leading-relaxed text-muted">
                A deterministic estimate computed from{" "}
                <code className="bg-surface-muted px-1 py-0.5 text-[0.75em]">
                  {payload.claim.algorithmVersion}
                </code>{" "}
                over {payload.claim.evidenceCount} attributable evidence items. The estimate is not
                a grade and is not comparable across professions or deployments.
              </p>
            </div>

            <div>
              <h2 className="text-[0.9375rem] font-medium">Limitations</h2>
              <ul className="mt-2 space-y-2">
                {payload.claim.limitations.map((limitation) => (
                  <li key={limitation} className="flex gap-2 text-[0.8125rem] leading-relaxed text-muted">
                    <span className="mt-[0.55rem] size-1 shrink-0 rounded-full bg-muted" aria-hidden />
                    {limitation}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h2 className="text-[0.9375rem] font-medium">Evidence commitment</h2>
              <dl className="mt-2 divide-y divide-border border-y border-border text-[0.75rem]">
                <div className="grid gap-1 py-2 sm:grid-cols-[7rem_minmax(0,1fr)]">
                  <dt className="text-muted">Merkle root</dt>
                  <dd className="break-all font-mono">{payload.evidence.root}</dd>
                </div>
                <div className="grid gap-1 py-2 sm:grid-cols-[7rem_minmax(0,1fr)]">
                  <dt className="text-muted">Items</dt>
                  <dd className="num">{payload.evidence.count}</dd>
                </div>
                <div className="grid gap-1 py-2 sm:grid-cols-[7rem_minmax(0,1fr)]">
                  <dt className="text-muted">Payload hash</dt>
                  <dd className="break-all font-mono">{certificate.payloadHash}</dd>
                </div>
                <div className="grid gap-1 py-2 sm:grid-cols-[7rem_minmax(0,1fr)]">
                  <dt className="text-muted">Certificate id</dt>
                  <dd className="break-all font-mono">{certificate.id}</dd>
                </div>
              </dl>
            </div>

            <p className="border-l-2 border-border pl-3 text-[0.75rem] leading-relaxed text-muted">
              {payload.disclaimer}
            </p>
          </div>

          <aside className="space-y-5">
            <div className="border border-border p-4">
              <p className="flex items-center gap-2 text-[0.8125rem] font-medium">
                {verification.signatureValid && verification.hashValid ? (
                  <ShieldCheck size={15} className="text-success" />
                ) : (
                  <ShieldAlert size={15} className="text-danger" />
                )}
                Signature
              </p>
              <dl className="mt-3 space-y-2 text-[0.6875rem]">
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-muted">Ed25519</dt>
                  <dd className={verification.signatureValid ? "text-success" : "text-danger"}>
                    {verification.signatureValid ? "valid" : "invalid"}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-muted">Payload hash</dt>
                  <dd className={verification.hashValid ? "text-success" : "text-danger"}>
                    {verification.hashValid ? "matches" : "mismatch"}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-muted">Key id</dt>
                  <dd className="font-mono">{certificate.keyId}</dd>
                </div>
              </dl>
              <p className="mt-3 text-[0.6875rem] leading-relaxed text-muted">
                Verify offline against the{" "}
                {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- JSON endpoint, not a page */}
                <a href="/api/certificates/key" className="text-primary underline underline-offset-2">
                  published public key
                </a>
                . The server is not trusted to tell you the signature is valid.
              </p>
            </div>

            <div className="border border-border p-4">
              <p className="text-[0.8125rem] font-medium">Certificate smart contract</p>
              <p className="mt-2 text-[0.6875rem] text-muted">{registry.reason}</p>
              {certificate.registryContractId ? (
                <a href={`https://hashscan.io/${certificate.registryNetwork?.replace("hedera-", "")}/contract/${certificate.registryContractId}`}
                  target="_blank" rel="noreferrer noopener" className="mt-2 inline-flex text-xs text-primary underline">
                  Inspect CertificateRegistry {certificate.registryContractId}
                </a>
              ) : null}
              {certificate.registryTxRef ? <p className="mt-2 break-all font-mono text-[0.625rem] text-muted">Issue transaction: {certificate.registryTxRef}</p> : null}
              {certificate.registryRevocationTxRef ? <p className="mt-2 break-all font-mono text-[0.625rem] text-muted">Revoke transaction: {certificate.registryRevocationTxRef}</p> : null}
            </div>

            <div className="border border-border p-4">
              <p className="flex items-center gap-2 text-[0.8125rem] font-medium">
                <BadgeCheck size={15} className="text-muted" />
                Hedera anchor
              </p>
              {certificate.anchorStatus === "confirmed" ? (
                <>
                  <dl className="mt-3 space-y-2 text-[0.6875rem]">
                    <div className="flex items-baseline justify-between gap-3">
                      <dt className="text-muted">Network</dt>
                      <dd>{certificate.anchorNetwork}</dd>
                    </div>
                    <div className="flex items-baseline justify-between gap-3">
                      <dt className="text-muted">Topic</dt>
                      <dd className="font-mono">{certificate.anchorTopicId}</dd>
                    </div>
                    <div className="flex items-baseline justify-between gap-3">
                      <dt className="text-muted">Sequence</dt>
                      <dd className="num">{certificate.anchorSequence}</dd>
                    </div>
                  </dl>
                  <p className="mt-3 text-[0.6875rem] leading-relaxed text-muted">
                    {mirror
                      ? mirror.reason
                      : "The receipt is stored locally; open HashScan to inspect the message."}
                  </p>
                  {certificate.anchorTopicId && certificate.anchorSequence !== null ? (
                    <a
                      href={`${hedera.explorerBase}/topic/${certificate.anchorTopicId}?sequence=${certificate.anchorSequence}`}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="mt-2 inline-flex items-center gap-1 text-[0.6875rem] font-medium text-primary hover:underline"
                    >
                      Inspect on HashScan <ArrowUpRight size={11} />
                    </a>
                  ) : null}
                </>
              ) : certificate.anchorStatus === "failed" ? (
                <p className="mt-2 text-[0.6875rem] leading-relaxed text-muted">
                  The Hedera submission did not complete. The signature is still verifiable, but no
                  consensus receipt exists for this certificate.
                </p>
              ) : (
                <p className="mt-2 text-[0.6875rem] leading-relaxed text-muted">
                  Hedera is not configured in this deployment. The certificate is signed but has no
                  public consensus receipt.
                </p>
              )}
            </div>

            <a
              href={`/api/certificates/${certificate.id}?download=1`}
              className="inline-flex w-full items-center justify-center gap-2 border border-border px-3 py-2 text-xs font-medium hover:bg-surface-muted"
            >
              <Download size={13} /> Download certificate JSON
            </a>
          </aside>
        </section>
      </main>
    </div>
  );
}
