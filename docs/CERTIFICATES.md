# Evidence certificates

A certificate is a **signed record of one capability at one moment**. It answers:
"what did RepuH record about this capability, under which method, and when?" It
does not answer "how good is this person?".

## Issuance rules

A certificate is issued only when:

1. The capability exists in the ontology.
2. The deterministic fingerprint currently returns a **non-null** estimate with
   status `provisional` or `established`.
3. At least one evidence item maps to that capability.

The service (`src/lib/certificates/service.ts`) reads the fingerprint rather than
recomputing a separate number, so a certificate and the profile cannot disagree.
Issuance is rate limited to 10 per hour per account and requires same-origin.

## Payload

```json
{
  "v": "repuh-certificate-1.0.0",
  "type": "repuh.certificate.v1",
  "id": "crt_<uuid>",
  "issuer": { "name": "RepuH", "url": "https://…" },
  "issuedAt": "2026-11-01T10:00:00.000Z",
  "subject": { "username": "…", "publicId": "…", "displayName": "…" },
  "claim": {
    "skillId": "typescript",
    "skillName": "TypeScript",
    "categoryId": "programming",
    "estimate": 72,
    "confidence": 0.68,
    "status": "established",
    "evidenceCount": 9,
    "projectCount": 3,
    "sourceCount": 2,
    "algorithmVersion": "scoring-1.0.0",
    "limitations": ["…"]
  },
  "evidence": { "root": "<merkle root>", "count": 9, "hashVersion": "repuh-evidence-v1" },
  "disclaimer": "…"
}
```

The evidence root is a Merkle tree over that capability's commitments only. It
proves the set of evidence items has not changed; it does not expose them. The
tree covers **exactly** the evidence the estimate counted: `evidence.count`
always equals `claim.evidenceCount`, and issuance refuses to produce a
certificate where the two would disagree (for example when records are tagged
with the skill but scoring rejected them as non-contributing).

## Signing

- **Algorithm:** Ed25519 over the UTF-8 bytes of the canonical JSON payload.
- **Canonical JSON:** object keys sorted lexicographically at every level;
  arrays keep their order; `undefined` omitted. Implemented by
  `canonicalize()` in `src/lib/integrity/merkle.ts`.
- **Hash:** SHA-256 over the same canonical bytes. Stored as `payload_hash` and
  submitted to HCS when configured.
- **Key id:** first 16 hex characters of SHA-256 over the public key's SPKI DER.

The signature and hash are stored beside the payload. Verification recomputes
both; a changed estimate, confidence, limitation or evidence root breaks the
signature.

### Key management

| Source | When | Notes |
| --- | --- | --- |
| `REPUH_CERT_SIGNING_KEY` | Deployment secret | Base64 PKCS#8 DER Ed25519 private key. Recommended. |
| Generated on first use | No key configured | Stored in `schema_meta`. Self-contained, but the private key sits in the same database as the records. |

The public key is served at `GET /api/certificates/key`:

```json
{
  "keyId": "…",
  "algorithm": "Ed25519",
  "publicKeyJwk": { "kty": "OKP", "crv": "Ed25519", "x": "…" },
  "source": "environment"
}
```

Rotating the key changes the key id; certificates signed with the old key remain
verifiable only if that old public key is retained. This MVP does not implement a
key history or revocation. Treat the key as stable and back it up.

### Verifying offline

```js
import { createPublicKey, verify } from "node:crypto";
import { readFileSync } from "node:fs";

const body = JSON.parse(readFileSync("certificate.json", "utf8"));
const key = JSON.parse(readFileSync("certificate-key.json", "utf8"));

// Reproduce the canonical form exactly: sorted keys, preserved arrays.
function canonical(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  return `{${Object.keys(value).sort().map((k) => `${JSON.stringify(k)}:${canonical(value[k])}`).join(",")}}`;
}

const publicKey = createPublicKey({ key: key.publicKeyJwk, format: "jwk" });
const ok = verify(
  null,
  Buffer.from(canonical(body.payload), "utf8"),
  publicKey,
  Buffer.from(body.certificate.signature, "base64"),
);
console.log(ok ? "signature valid" : "signature invalid");
```

Download a certificate from `/certificate/<id>` → *Download certificate JSON*.
The download includes the payload, signature and key id, so the check above needs
only the published key.

## Anchoring

When Hedera is configured, the certificate hash is submitted to HCS as a
`repuh.certificate.v1` envelope. A status of `confirmed` means a topic sequence
number was returned.

- No Hedera configuration → `unavailable`; the page says the certificate is
  signed but not anchored.
- Submit failure → `failed`; the signature still verifies, no receipt is claimed.
- The anchor is **not** part of the signed payload. Adding or losing a receipt
  cannot invalidate the claim.

## Public page

`/certificate/<id>` is public and unlisted (`noindex`). It shows the subject,
claim, confidence, limitations, evidence root, signature check, anchor state and
mirror-node corroboration. No private evidence, event payload, email or project
identifier appears.

Anyone with the id can read it. Issuance is the act of publishing: the payload
contains the subject's display name and username even when the profile itself is
private. Do not issue a certificate from an identity you do not want linked to
the claim.

## Revocation

Certificates can be revoked by their issuer through `POST /api/certificates/[id]/revoke` with an optional `{ "reason" }` body. Revocation sets `status = revoked` and records `revoked_at` and `revocation_reason`; the signature remains verifiable, but verification reports the revoked state. A public status list is available at `GET /api/certificates/status`.

- **Revocation UI.** Now implemented for the issuer: `POST /api/certificates/[id]/revoke` and a revoke control on the certificates page. A public revocation statement and key-history story are still missing.
- **PDF.** The download is JSON. A PDF renderer would be presentation only and is
  not shipped.
- **W3C Verifiable Credential envelope.** The payload is inspired by the model
  but is not a conforming VC; the proof type is a plain Ed25519 signature.
- **Expiry.** Certificates do not expire. The estimate they record ages; the
  limitation text and algorithm version are how a reader judges that.
- **Selective disclosure.** A certificate is all-or-nothing.

## CertificateRegistry smart contract (second contract)

`contracts/CertificateRegistry.sol` implements an independent certificate lifecycle,
separate from `EvidenceAnchor`. The owner authorises issuer addresses with
`setIssuer(address,bool)`. Authorised issuers call
`issueCertificate(bytes32,bytes32)`; duplicate IDs and zero IDs/hashes are rejected.
Only the original issuer can call `revokeCertificate(bytes32)`, even if permission
to issue new certificates was subsequently removed. Revocation is irreversible
and repeat revocation is idempotent. `getCertificate(bytes32)` returns the hash,
issuer address, issuance timestamp and revoked flag. Events record issuance,
revocation and issuer permission changes. The contract is unaudited.

On-chain ID = SHA-256 of `repuh.certificate-registry.v1|` followed by the certificate
ID. Registry interface version is v1; certificate payload version and canonical
signing bytes are unchanged. The chain receives only that ID digest and the
payload fingerprint; it also records the public issuer address and timestamp.
It receives no raw certificate, personal fields, estimates or revocation reason.

### Configure and demonstrate

1. Run `pnpm contracts:build` to compile both contracts.
2. Configure a funded **testnet** operator using `HEDERA_OPERATOR_ID` and
   `HEDERA_OPERATOR_KEY` in `.env.local`. Do not commit credentials.
3. Run `pnpm contracts:deploy` for EvidenceAnchor and
   `pnpm contracts:deploy:certificates` for CertificateRegistry.
4. Save the printed `HEDERA_CONTRACT_ID` and `HEDERA_CERTIFICATE_CONTRACT_ID`
   in `.env.local`, then restart the app. The deploying operator is the initial
   certificate issuer. Other operators need `setIssuer` authorisation; only the
   address that issued a record can revoke it.
5. Issue a certificate for an established or provisional capability. The result
   distinguishes consensus anchoring from smart-contract registration. Contract
   confirmation requires a SUCCESS receipt and matching `getCertificate` result.
6. Open its public certificate page. It reads the saved contract and network and
   reports the live fingerprint match and revocation flag. The JSON download also
   contains registry receipts and the live check. An unreachable network is
   explicitly unverified, never silently valid.
7. Revoke from the certificates page. Local revocation takes effect immediately;
   on-chain revocation is confirmed only after a successful transaction and
   read-back. A failed network operation shows a retry control. Show the professor
   the changed public status and both transaction receipts on HashScan.

The consensus topic is optional and remains a separate legacy anchor path.
`anchorStatus` continues to describe that HCS receipt; registry fields describe
contract registration. Without registry configuration, the signed certificate
still works and the UI says contract registration is unavailable. Older certificates
are not automatically registered. If initial registration fails, the signed
certificate is retained but no confirmed contract receipt is claimed; automatic
registration reconciliation is not implemented.

Stored contract IDs and networks are used for later verification and revocation,
so changing the configured deployment does not redirect old certificates. The
operator must be configured on the original network; a mismatch is unverified.
Deleting an account cascades through local certificate/receipt rows, but cannot
erase on-chain fingerprints or revoke them automatically.

### Verification performed in this repository

`tests/certificate-registry.test.ts` deploys the compiled bytecode to an in-process
local EVM and exercises permissions, invalid inputs, duplicate prevention,
issuance, read-back, disabling issuers, revocation and repeat revocation.
`tests/certificate-registry-storage.test.ts` checks migration of an older database,
receipt persistence, ownership, retryable network failures and deletion cascades.
These are local tests, not evidence of a live Hedera deployment.
