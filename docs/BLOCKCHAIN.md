# Integrity and anchoring

## Principle

Evidence stays private and off-chain. What can leave the system is a **Merkle
root over deterministic commitments**, plus — when Hedera is configured — a
single consensus-service message containing that root. An anchor proves a batch
has not been altered since submission. It does **not** prove skill, employment or
identity, and the UI says so next to every anchor.

For the network integration itself see [docs/HEDERA.md](HEDERA.md); for signed
capability records see [docs/CERTIFICATES.md](CERTIFICATES.md).

## Commitment

```
commitment = sha256(canonicalJSON({
  v: "repuh-evidence-v1",
  e: evidenceId,
  s: signal,
  t: occurredAt,
  c: contentHash
}))
```

`contentHash` is itself SHA-256 over a canonical record of `{signal, occurredAt,
sorted skill ids, quality}`. The input deliberately excludes display name,
username, email, project name, repository name, estimate, confidence and raw
payload.

`canonicalize()` sorts object keys and preserves array order, so the same record
produces the same bytes on any machine.

## Tree

`buildMerkleTree(commitments)`:

- `leaf = sha256("leaf:" + commitment)`
- `parent = sha256("node:" + left + right)`
- An odd node is paired with itself at each level.
- Layers are retained in memory for proof generation.

`merkleProof(tree, index)` returns sibling hashes with positions;
`verifyProof(proof)` recomputes upward and compares to the root. Domain
separation (`leaf:` / `node:`) prevents second-preimage confusion between leaves
and internal nodes.

## Batching

`anchorEvidence(userId)`:

1. Loads every evidence item for the account.
2. Drops commitments already present in an existing batch.
3. Builds a tree over the remainder; refuses when nothing is pending.
4. Submits the root through the resolved provider.
5. Persists the anchor only after the provider returns.

`batch_id` is sequential per user and unique with `user_id`.

## Providers

| Provider | When | Status recorded |
| --- | --- | --- |
| `local` | Hedera not configured | `local`; `tx_ref = local:<batch>:<root prefix>`; explicitly not on-chain |
| `hedera-hcs` | Operator, key and topic present | `confirmed` after a receipt with a topic sequence number |

A configured provider that fails to reach consensus **throws**, so no batch row
is written for a transaction that did not complete. The old placeholder that
recorded a `pending:` reference for an unsubmitted transaction has been removed:
a reference without a receipt is not an anchor.

Batches store `topic_id`, `sequence_number` and `consensus_timestamp`. The
settings panel links each confirmed batch to HashScan.

## Independent verification

`POST /api/blockchain/verify` with `{ batchId, commitment }`:

- Unknown batch or commitment → `404 proof_unavailable` with a reason.
- Known → `{ verified, proof: { path, root, leaf, index }, disclaimer }`.

The integrity panel lets a person pick a commitment, see the proof path, and
watch verification fail when a single character is altered. Failure is presented
as a successful detection, not an error.

A second, network-level check is possible without credentials: read the HCS
message from a mirror node and compare the root. The certificate page does this
on render; batch verification exposes the topic and sequence so a reader can do
it manually.

## Certificate anchoring

A certificate hashes its signed payload and submits a `repuh.certificate.v1`
envelope to the same topic. The anchor is stored beside the certificate, not
inside the signed payload, so the signature stays valid regardless of the
network. See [docs/CERTIFICATES.md](CERTIFICATES.md).

## Deletion and irreversibility

Deleting an account removes stored anchors through cascade, but a root already
ordered by a public consensus service cannot be recalled. The deletion dialog
states this before requiring the password, and the export lists anchors so the
user can see what would remain irreversible. No envelope contains personal data,
which is what makes that acceptable.

## What this is not

- Not a reputation token, not transferable, not a financial instrument.
- Not proof that work happened — only that the classified record has not changed
  since the root was submitted.
- Not a substitute for the scoring engine's own confidence reporting.
- Not a mainnet deployment; the repository ships no credentials and the default
  state is local.

## Contract folder

`contracts/EvidenceAnchor.sol` is retained as an alternative design (anchor a
root in contract storage). It is unaudited, undeployed and **not used by the
application**. Hedera HCS is the implemented path because the claim needs
ordering and timestamping, not programmability.
