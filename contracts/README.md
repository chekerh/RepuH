# Contracts

`EvidenceAnchor.sol` is the anchoring contract used by the application: a Merkle
root per batch id, submitted by an authorised `anchorer`, with duplicate batch
ids rejected.

```solidity
submitRoot(bytes32 root, uint256 batchId) external onlyAnchorer
getRoot(uint256 batchId) external view returns (bytes32)
rootExists(uint256 batchId) external view returns (bool)
setAnchorer(address next) external onlyOwner
```

## Status

- **Compiled by this repository.** `pnpm contracts:build` runs solc 0.8.26 with
  the optimizer on and `evmVersion: london`, and writes
  `artifacts/EvidenceAnchor.json` (ABI, bytecode, deployed bytecode, method
  identifiers, source SHA-256). The artifact is committed.
- **Used by the application** when `HEDERA_CONTRACT_ID` is set: evidence batches
  are submitted through `src/lib/hedera/contract.ts`, which calls `submitRoot`
  and then reads the root back with `getRoot` before recording `confirmed`.
- **Deployable but not deployed from here.** `pnpm contracts:deploy` creates the
  contract with `ContractCreateFlow` and prints the contract id.
- **Not audited.** Do not use with real value or production commitments.

There is no upgrade proxy. A new deployment is a new contract id; roots stored
at the previous id stay readable and are never migrated or rewritten.

## What goes on-chain

The `batchId` the application submits is not its per-account batch number: it is
`uint256(sha256("repuh.contract-batch.v1|" + userId + "|" + batchId))`, so two
accounts cannot collide on batch 1 and be rejected as duplicates. The mapping
stays a plain `uint256`; the derivation lives in
`src/lib/integrity/anchoring.ts` and is covered by a unit test.

Only a 32-byte Merkle root and the derived batch key. Commitments are SHA-256
hashes over
a canonical structure containing a hash version, an evidence id, the signal, the
timestamp and a content digest. The input excludes names, email addresses, skill
estimates and project identifiers.

## Build and deploy

```bash
pnpm contracts:build    # compile source → artifacts/EvidenceAnchor.json
pnpm contracts:deploy   # requires HEDERA_OPERATOR_ID / HEDERA_OPERATOR_KEY
```

Deployment prints:

```text
HEDERA_CONTRACT_ID=0.0.xxxxxxx
```

Add it to `.env.local` and restart the app. `HEDERA_NETWORK` selects the
network; testnet and previewnet are the supported defaults, mainnet needs a
deliberate decision.

## Verifying the deployed code

`tests/contract.test.ts` recomputes the source SHA-256 and compares it with the
artifact, and pins the function selectors (`submitRoot(bytes32,uint256)` →
`5e4c087d`, `getRoot(uint256)` → `9b24b3b0`). To compare a deployment with this
source, compare the deployed bytecode from the mirror node with
`artifacts/EvidenceAnchor.json`'s `deployedBytecode`.

## Second contract: CertificateRegistry

`CertificateRegistry.sol` independently manages certificate fingerprints and
revocation. See [certificate lifecycle and demo steps](../docs/CERTIFICATES.md#certificateregistry-smart-contract-second-contract).

- `setIssuer(address,bool)` — owner controls who can issue.
- `issueCertificate(bytes32,bytes32)` — authorised issuer records an immutable fingerprint.
- `revokeCertificate(bytes32)` — original issuer irreversibly revokes.
- `getCertificate(bytes32)` — reads fingerprint, issuer, timestamp and revocation flag.

`pnpm contracts:build` compiles both contracts. Deploy the second with
`pnpm contracts:deploy:certificates`, then configure the printed
`HEDERA_CERTIFICATE_CONTRACT_ID`. It is unaudited; no live deployment is implied
by the committed artifact. Local EVM lifecycle tests run with `pnpm test`.
