import {
  createPublicKey,
  sign as edSign,
  verify as edVerify,
  type JsonWebKey,
  type KeyObject,
} from "node:crypto";
import { signingKey } from "@/lib/certificates/keys";
import { certificateCanonical, type CertificatePayload } from "@/lib/certificates/payload";

export interface CertificateSignature {
  signature: string;
  keyId: string;
}

/** Sign the canonical payload bytes. Ed25519 signs the message directly (no prehash). */
export function signCertificate(payload: CertificatePayload): CertificateSignature {
  const { privateKey, keyId } = signingKey();
  const signature = edSign(null, Buffer.from(certificateCanonical(payload), "utf8"), privateKey);
  return { signature: signature.toString("base64"), keyId };
}

/** Verify against the deployment key, or against any supplied public key. */
export function verifyCertificate(
  payload: CertificatePayload,
  signature: string,
  publicKey?: KeyObject,
): boolean {
  try {
    const key = publicKey ?? signingKey().publicKey;
    return edVerify(
      null,
      Buffer.from(certificateCanonical(payload), "utf8"),
      key,
      Buffer.from(signature, "base64"),
    );
  } catch {
    return false;
  }
}

export function publicKeyFromJwk(jwk: JsonWebKey): KeyObject {
  return createPublicKey({ key: jwk, format: "jwk" });
}

/** Parses a stored payload back into an object without trusting its contents. */
export function parseCertificatePayload(raw: string): CertificatePayload | null {
  try {
    const parsed = JSON.parse(raw) as CertificatePayload;
    if (typeof parsed?.id !== "string" || typeof parsed?.claim?.skillId !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}
