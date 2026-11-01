# Hedera integration

RepuH uses **Hedera Consensus Service (HCS)** for the part of the product that
must be independently checkable: the ordering and timestamping of Merkle roots
and certificate hashes. It does not use a smart contract, does not mint a token,
and does not put a score, a person or an evidence payload on a public network.

This mirrors the certificate material this project was built against: HCS for
consensus and provenance, HTS/HSCS available but unnecessary for the claim being
made.

## Why HCS rather than an EVM contract

| Requirement | HCS | Contract |
| --- | --- | --- |
| Prove a root existed at a time | Native, ordered, timestamped | Needs a transaction and storage design |
| Deterministic finality | Yes, after consensus | Depends on chain |
| Cost per anchor | Fixed, small USD-denominated fee | Gas, variable |
| Code to audit | None | Contract + upgrade path |
| Personal data risk | Envelope only | Same, but easier to add by accident |

The product needs a receipt, not a program. A contract would add an upgrade and
key-management surface without strengthening the claim.

## What is submitted

Two envelope types, both defined in `src/lib/hedera/envelopes.ts`:

```json
{
  "v": "repuh-hcs-1",
  "type": "repuh.anchor.v1",
  "app": "repuh",
  "root": "<64 hex chars>",
  "batch": 3,
  "leaves": 52,
  "at": "2026-11-01T10:00:00.000Z"
}
```

```json
{
  "v": "repuh-hcs-1",
  "type": "repuh.certificate.v1",
  "app": "repuh",
  "id": "crt_...",
  "hash": "<64 hex chars>",
  "root": "<64 hex chars>",
  "skill": "typescript",
  "at": "2026-11-01T10:00:00.000Z"
}
```

Excluded by construction and by test: usernames, display names, emails,
estimates, confidence, project names, repository names, evidence text and raw
payloads. `tests/hedera.test.ts` asserts the anchor envelope contains none of
those fields.

Both fit well inside the 1024-byte single-message limit; the builder rejects an
oversized envelope **before** a transaction is constructed.

## Configuration

```bash
# .env.local
HEDERA_NETWORK=testnet          # testnet | previewnet | mainnet
HEDERA_OPERATOR_ID=0.0.xxxxx
HEDERA_OPERATOR_KEY=...         # ED25519 or ECDSA, never committed
HEDERA_TOPIC_ID=0.0.yyyyy
```

Create an operator at <https://portal.hedera.com>, fund it from the testnet
faucet, then:

```bash
pnpm hedera:setup
```

The script reads `.env.local`, prints the network and operator balance, creates a
topic if `HEDERA_TOPIC_ID` is absent, and prints the line to add. It never prints
the private key and never writes secrets to disk.

The three variables are required together. A partial configuration is reported
as **not configured**, with the missing names listed in the API and the settings
UI. The local deterministic adapter remains in use until all three are present
and the key parses.

## Status semantics

| Status | Meaning |
| --- | --- |
| `local` | No Hedera configuration. A deterministic local reference, explicitly not on-chain. |
| `confirmed` | The SDK received a receipt with a topic sequence number. The message was ordered by consensus. |
| `failed` | A configured submit did not reach a receipt. No anchor row is written for batches; a certificate keeps its signature and says the anchor failed. |
| `unavailable` | Only used for certificates when Hedera is not configured. |

`confirmed` is never written from a submitted transaction id alone. The code
waits for `getReceipt()` and requires `topicSequenceNumber`; otherwise it throws.

## Where the receipt is stored

`blockchain_anchors` gains `topic_id`, `sequence_number` and
`consensus_timestamp`. Certificates store `anchor_topic_id`, `anchor_sequence`,
`anchor_tx_ref`, `anchor_network` and `anchor_status`.

The settings → Integrity panel shows the status, topic, sequence and a HashScan
link per batch. The public certificate page shows the same and attempts an
independent mirror-node read.

## Independent verification

1. **HashScan** — open the topic/sequence link; the message is the envelope above.
2. **Mirror node** — no credentials required:

   ```bash
   curl "https://testnet.mirrornode.hedera.com/api/v1/topics/<topic>/messages/<sequence>"
   ```

   The `message` field is base64; decode it and compare `root` (anchors) or
   `hash` (certificates) with the stored value.
3. **Inclusion proof** — `POST /api/blockchain/verify` with `{ batchId,
   commitment }` proves a specific commitment is inside the anchored root without
   revealing the evidence.

The certificate page performs step 2 on render and reports whether the mirrored
message matches. A mirror-node outage is reported as "could not be read", never
as a failed anchor.

## Certificates

Certificates are Ed25519-signed JSON documents. See
[docs/CERTIFICATES.md](CERTIFICATES.md) for the payload, key management and
offline verification. The HCS message anchors the certificate hash; it does not
contain the certificate.

## Operational constraints

- **Operator key custody.** The key lives in the deployment environment. It can
  submit to the topic; it cannot read private evidence because none is sent. Use
  a dedicated operator account with a small balance.
- **Topic submit keys.** A production deployment should set an HCS submit key so
  only the authorised operator can write. The setup script creates a topic
  without one; add a submit key before using a public topic.
- **Testnet resets.** Testnet state can be reset by the network operator. Anchors
  are test receipts, not permanent public records. Mainnet requires a deliberate
  decision and is not configured here.
- **Deletion.** Account deletion removes stored anchors, but a message already
  ordered by HCS cannot be recalled. The envelopes contain no personal data,
  which is what makes that acceptable. The deletion dialog and
  [docs/BLOCKCHAIN.md](BLOCKCHAIN.md) say this before confirming.
- **No HTS token or NFT.** Certificate ownership is not represented as a token.
  Issuing NFTs would add a transferable-asset claim the product does not need and
  would obscure that the certificate is a record, not a collectible.
- **No HSCS contract.** The reference `contracts/EvidenceAnchor.sol` remains in
  the repository as an alternative design, is unaudited and is **not** the path
  the application uses.

## Verification performed for this MVP

- Envelope construction, size limit and PII exclusion: unit tests (pass).
- Provider selection and status reporting: exercised with Hedera unconfigured;
  the UI and API report `local` and name the missing variables.
- Real HCS submission: **not executed** in this environment, because no Hedera
  operator credentials exist here. The code path is complete but the first real
  submit must be run by the operator after `pnpm hedera:setup`.

That distinction matters: a compiled integration is not a confirmed transaction.
