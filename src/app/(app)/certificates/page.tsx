import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Award, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui";
import { CertificateIssuer } from "@/components/certificates/issuer";
import { RevokeCertificateButton } from "@/components/certificates/revoke";
import { requireOnboarded } from "@/lib/auth/session";
import { computeFingerprint } from "@/lib/services/ingest";
import { SKILLS_BY_ID } from "@/lib/ontology";
import type { SkillEstimate } from "@/lib/scoring";
import { listCertificates } from "@/lib/db/queries";
import { parseCertificatePayload } from "@/lib/certificates/sign";
import { hederaStatus } from "@/lib/hedera/config";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Certificates" };
export const dynamic = "force-dynamic";

export default async function CertificatesPage() {
  const user = await requireOnboarded();
  const { fingerprint } = computeFingerprint(user.id);
  const hedera = hederaStatus();

  const issued = listCertificates(user.id).map((certificate) => {
    const payload = parseCertificatePayload(certificate.payload);
    return {
      id: certificate.id,
      skillName: payload?.claim.skillName ?? certificate.skillId,
      estimate: payload?.claim.estimate ?? null,
      confidence: payload?.claim.confidence ?? null,
      status: certificate.status,
      anchorStatus: certificate.anchorStatus,
      anchorSequence: certificate.anchorSequence,
      registryContractId: certificate.registryContractId,
      registryRevocationTxRef: certificate.registryRevocationTxRef,
      createdAt: certificate.createdAt,
    };
  });

  const issuable = fingerprint.skills
    .filter(
      (skill): skill is SkillEstimate & { estimate: number } =>
        skill.estimate !== null && skill.status !== "insufficient",
    )
    .map((skill) => ({
      skillId: skill.skillId,
      name: SKILLS_BY_ID.get(skill.skillId)?.name ?? skill.skillId,
      estimate: skill.estimate,
      confidence: skill.confidence,
      status: skill.status,
    }));

  return (
    <div className="space-y-8">
      <PageHeader
        title="Certificates"
        description="A signed record of one capability at one moment, with its confidence, method and limits attached. The signature is verifiable against a published key; the anchor, when present, can be a CertificateRegistry registration or a Hedera consensus receipt."
        actions={
          <Link
            href="/settings#integrity"
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            Integrity settings <ArrowUpRight size={12} />
          </Link>
        }
      />

      <section className="flex items-start gap-3 border-l-2 border-border pl-4">
        <ShieldCheck size={16} className="mt-0.5 shrink-0 text-muted" />
        <div>
          <p className="text-[0.8125rem] font-medium">
            Signature: Ed25519 ·{" "}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- JSON endpoint, not a page */}
            <a
              href="/api/certificates/key"
              className="font-normal text-primary underline underline-offset-2"
            >
              published key
            </a>
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            {hedera.certificateContractConfigured
              ? `CertificateRegistry ${hedera.certificateContractId} on Hedera ${hedera.network}. Issuance and revocation are recorded only after a successful call and matching read-back.`
              : `Smart-contract certificate registration is unavailable. Set ${hedera.certificateContractMissing.join(", ")}. `}
            {hedera.configured
              ? `Hedera ${hedera.network} consensus service · topic ${hedera.topicId}. Certificate hashes are submitted after signing and recorded only once the network returns a sequence number.`
              : `Hedera is not configured. Certificates are signed but not anchored to a public network. Set ${hedera.missing.join(", ") || "the Hedera variables"} to enable anchoring.`}
          </p>
        </div>
      </section>

      <section>
        <h2 className="text-[0.9375rem] font-medium">Issue a certificate</h2>
        <p className="mt-1 max-w-[62ch] text-[0.8125rem] leading-relaxed text-muted">
          Only capabilities with a recorded estimate can be certified. The certificate reproduces
          the same estimate and confidence the fingerprint shows, including the limitations, so the
          two cannot disagree.
        </p>
        <div className="mt-4">
          <CertificateIssuer skills={issuable} />
        </div>
      </section>

      <section>
        <h2 className="text-[0.9375rem] font-medium">Issued</h2>
        {issued.length === 0 ? (
          <p className="mt-2 border-y border-border py-5 text-[0.8125rem] text-muted">
            No certificate has been issued from this account.
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-border border-y border-border">
            {issued.map((certificate) => (
              <li key={certificate.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 text-[0.8125rem] font-medium">
                    <Award size={13} className="text-muted" />
                    {certificate.skillName}
                    {certificate.estimate !== null ? (
                      <span className="num font-normal text-muted">{certificate.estimate}</span>
                    ) : null}
                    <Badge
                      tone={
                        certificate.registryContractId || certificate.anchorStatus === "confirmed"
                          ? "success"
                          : certificate.anchorStatus === "failed"
                            ? "danger"
                            : "neutral"
                      }
                    >
                      {certificate.registryContractId
                        ? "Contract registered"
                        : certificate.anchorStatus === "confirmed"
                        ? `Hedera #${certificate.anchorSequence}`
                        : certificate.anchorStatus === "failed"
                          ? "anchor failed"
                          : "unanchored"}
                    </Badge>
                    {certificate.status === "revoked" ? <Badge tone="danger">revoked</Badge> : null}
                  </p>
                  <p className="mt-0.5 font-mono text-[0.625rem] text-muted">{certificate.id}</p>
                  <p className="mt-0.5 text-[0.6875rem] text-muted">
                    {formatDateTime(certificate.createdAt)}
                    {certificate.confidence !== null
                      ? ` · ${Math.round(certificate.confidence * 100)}% confidence`
                      : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {certificate.status === "active" || (certificate.registryContractId && !certificate.registryRevocationTxRef) ? <RevokeCertificateButton certificateId={certificate.id} retry={certificate.status === "revoked"} /> : null}
                  <Link
                    href={`/certificate/${certificate.id}`}
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    Open <ArrowUpRight size={12} />
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
