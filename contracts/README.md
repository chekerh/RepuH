# Contracts

`EvidenceAnchor.sol` is the minimal anchoring contract described in the
specification: `submitRoot(bytes32 root, uint256 batchId)`, `getRoot(uint256)`
and a root-existence check, restricted to an authorised anchoring account, with
duplicate batch ids rejected.

## Status

- **Not deployed.** No mainnet deployment is part of this MVP.
- **Not audited.** Do not use with real value or production commitments.
- **Not compiled by this repository's CI.** Foundry/Hardhat are not installed;
  the application's anchoring path uses the deterministic local adapter in
  `src/lib/integrity` and `src/lib/blockchain`.

## What goes on-chain

Only a 32-byte Merkle root per batch. Commitments are SHA-256 hashes over a
canonical structure containing a hash version, an evidence id, the signal, the
timestamp and a content digest. The input excludes names, email addresses, skill
estimates and project identifiers.

## How to exercise it locally

```bash
# with Foundry installed
forge init --force --no-git .   # not required by the app
forge build contracts/EvidenceAnchor.sol
```

If you wire a real adapter, the application expects:

```ts
interface AnchorProvider {
  submit(root: string, batchId: number): Promise<{ status: AnchorStatus; txRef: string | null }>;
}
```

and must leave every unverified state labelled as such.
