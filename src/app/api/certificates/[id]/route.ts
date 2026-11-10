import { fail, ok } from "@/lib/http";
import { findCertificate } from "@/lib/db/queries";
import { verifyStoredCertificate, verifyCertificateRegistry } from "@/lib/certificates/service";
import { hederaStatus } from "@/lib/hedera/config";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const certificate = findCertificate(id);
  if (!certificate) return fail("not_found", "No certificate with that id.", 404);

  const verification = verifyStoredCertificate(certificate);
  if (!verification.ok) {
    return fail("invalid_certificate", verification.reason, 422);
  }

  const registry = await verifyCertificateRegistry(certificate);
  const status = hederaStatus();
  const body = {
    certificate: {
      id: certificate.id,
      payloadHash: certificate.payloadHash,
      signature: certificate.signature,
      keyId: certificate.keyId,
      status: certificate.status,
      createdAt: certificate.createdAt,
    },
    payload: verification.payload,
    registry: {
      contractId: certificate.registryContractId,
      network: certificate.registryNetwork,
      transactionId: certificate.registryTxRef,
      revocationTransactionId: certificate.registryRevocationTxRef,
      ...registry,
    },
    verification: {
      revoked: certificate.status === "revoked" || registry.revoked === true,
      signatureValid: verification.signatureValid,
      hashValid: verification.hashValid,
      reason: verification.reason,
      keyUrl: "/api/certificates/key",
    },
    anchor: {
      status: certificate.anchorStatus,
      network: certificate.anchorNetwork,
      topicId: certificate.anchorTopicId,
      sequenceNumber: certificate.anchorSequence,
      transactionId: certificate.anchorTxRef,
      explorerUrl:
        certificate.anchorTopicId && certificate.anchorSequence !== null
          ? `${status.explorerBase}/topic/${certificate.anchorTopicId}?sequence=${certificate.anchorSequence}`
          : null,
    },
  };

  const url = new URL(request.url);
  if (url.searchParams.get("download") === "1") {
    return new Response(`${JSON.stringify(body, null, 2)}\n`, {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "content-disposition": `attachment; filename="repuh-certificate-${certificate.id}.json"`,
        "cache-control": "private, no-store",
      },
    });
  }

  return ok(body);
}
