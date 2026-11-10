# Integrity and anchoring

## Principle

Evidence stays private and off-chain. What can leave the system is a **Merkle
root over deterministic commitments**: written to the `EvidenceAnchor` contract
(Hedera Smart Contract Service) when a contract is configured, otherwise sent as
a single consensus-service message, otherwise kept as a local commitment. An
anchor proves a batch has not been altered since submission. It does **not**
prove skill, employment or identity, and the UI says so next to every anchor.

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
4. Submits the root through the resolved provider: `submitRoot` on the
   EvidenceAnchor contract under a key derived from the account and batch
   ([docs/HEDERA.md](HEDERA.md)), then a `getRoot` read-back; otherwise an HCS
   message with a consensus receipt; otherwise a local reference.
5. Persists the anchor only after the provider returns.

`batch_id` is sequential per user and unique with `user_id`.

## Providers

| Provider | When | Status recorded |
| --- | --- | --- |
| `hedera-contract` | Operator, key and contract id present (**preferred**) | `confirmed` after `submitRoot` returns SUCCESS and `getRoot` reads the submitted root back |
| `hedera-hcs` | Operator, key and topic present, no contract | `confirmed` after a receipt with a topic sequence number |
| `local` | Hedera not configured | `local`; `tx_ref = local:<batch>:<root prefix>`; explicitly not on-chain |

A configured provider that fails **throws**, so no batch row is written for a
transaction that did not complete. The old placeholder that recorded a
`pending:` reference for an unsubmitted transaction has been removed: a
reference without a receipt is not an anchor.

Contract batches store `contract_id`, `contract_batch_id`, `tx_ref` and
`consensus_timestamp`; consensus batches store `topic_id`, `sequence_number` and
`consensus_timestamp`. The settings panel links each confirmed batch to HashScan
and prints the on-chain batch key the root is stored under.

## Independent verification

`POST /api/blockchain/verify` with `{ batchId, commitment }`:

- Unknown batch or commitment → `404 proof_unavailable` with a reason.
- Known → `{ verified, proof: { path, root, leaf, index }, disclaimer }`.

The integrity panel lets a person pick a commitment, see the proof path, and
watch verification fail when a single character is altered. Failure is presented
as a successful detection, not an error.

A second, network-level check re-reads the anchor itself: `getRoot(batchId)` for
contract batches, the mirror-node message for consensus batches. The verify
route returns this as `chain: { checked, matches, via, reason }`. It is
credential-free from a reader's side too — see [docs/HEDERA.md](HEDERA.md) for
the HashScan link and the `eth_call` form of the contract read.

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

## Contract

`contracts/EvidenceAnchor.sol` stores one root per batch id and is the preferred
anchoring path. It is compiled by `pnpm contracts:build`, deployed by
`pnpm contracts:deploy`, and called from `src/lib/hedera/contract.ts`. It is
unaudited and has no upgrade proxy; a replacement is a new contract id. HCS
remains the path for certificate hashes, where the claim is ordering and
timestamping rather than addressable state.
