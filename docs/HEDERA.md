# Hedera integration

RepuH uses two Hedera services for the part of the product that must be
independently checkable, and they do different jobs:

| Path | Service | What it stores | Used for |
| --- | --- | --- | --- |
| **Contract** | Smart Contract Service (HSCS) | one `bytes32` Merkle root per `batchId`, plus `block.timestamp` | evidence batches — the primary path |
| **Consensus** | Consensus Service (HCS) | a small JSON envelope per message | certificate hashes, and evidence batches only when no contract is configured |

Neither path receives a name, an email address, a person, an evidence payload, a
skill estimate or a project name. A batch root is the only thing that leaves the
system, and it is the same information a public Merkle root already exposes.

## Why a smart contract is used

The project requirement is an on-chain contract, and the contract earns its
place beyond the requirement:

- **One root per batch id, permanently.** `submitRoot` rejects a batch id that
  already has a root (`DuplicateBatch`), so a submitted root cannot be replaced
  or re-pointed by the operator.
- **Publicly readable state.** `getRoot(batchId)` is a view function. Anyone can
  read it through a mirror node or `eth_call` without trusting this application.
- **The same guarantee as HCS for the actual claim**, with an addressable
  contract that a reviewer can inspect at a fixed id.
- **No personal data by construction.** The function signature accepts a digest
  and an integer. There is no field for anything else.

HCS is still used for certificates because a certificate anchor is a message
(an id, a hash, a root, a skill id, a time) rather than a slot keyed by batch,
and ordering plus timestamping is the whole claim. Sending a certificate hash to
the contract would need a second storage design for no stronger a claim.

## The contract

`contracts/EvidenceAnchor.sol` — Solidity `^0.8.24`, compiled with solc 0.8.26,
optimizer on, `evmVersion: london` (no `PUSH0`, which is the usual Hedera
deployment failure).

```solidity
submitRoot(bytes32 root, uint256 batchId)   // onlyAnchorer, rejects duplicates
getRoot(uint256 batchId) view returns (bytes32)
rootExists(uint256 batchId) view returns (bool)
setAnchorer(address next)                   // onlyOwner
```

The compiled artifact is committed at `contracts/artifacts/EvidenceAnchor.json`
(ABI, init bytecode, deployed bytecode, method identifiers, source SHA-256). A
unit test fails if the artifact no longer matches the committed source, so the
deployed bytecode cannot silently drift from the code under review.

### The uint256 a root is stored under

`EvidenceAnchor` keys roots by one `uint256`, while RepuH numbers batches per
account. Sending the local batch number directly would make every account
collide on batch 1, and the contract rejects a duplicate id — the second account
could never anchor. The adapter therefore submits a derived key:

```
key = uint256(sha256("repuh.contract-batch.v1|" + userId + "|" + batchId))
```

It is globally unique, stable for a stored batch, and reproducible from the row.
The settings panel prints the decimal key beside each contract anchor; that
value — not the per-account batch number — is what `getRoot` takes. The app also
numbers batches from the highest existing id rather than the row count, so a
deleted batch cannot cause an id that is already on-chain to be reused.

## Configuration

```bash
# .env.local
HEDERA_NETWORK=testnet
HEDERA_OPERATOR_ID=0.0.xxxxx
HEDERA_OPERATOR_KEY=...          # ED25519 or ECDSA, never committed
HEDERA_CONTRACT_ID=0.0.yyyyy     # deployed EvidenceAnchor
HEDERA_TOPIC_ID=0.0.zzzzz        # optional: certificate hashes
```

Build and deploy the contract:

```bash
pnpm contracts:build     # source → contracts/artifacts/EvidenceAnchor.json
pnpm contracts:deploy    # prints HEDERA_CONTRACT_ID=<id> and a HashScan link
```

`contracts:deploy` refuses to replace an existing `HEDERA_CONTRACT_ID`; a new
deployment is a new contract id, and roots at the old id stay readable.

Create or verify the certificate topic:

```bash
pnpm hedera:setup        # balance preflight + topic creation if missing
```

The scripts read `.env.local`, print the network, contract/topic ids and the
operator balance. They never print the private key and never write secrets to
disk.

The variables are reported separately: `HEDERA_CONTRACT_ID` makes **contract
anchoring** available, `HEDERA_TOPIC_ID` makes **certificate anchoring**
available. A partial configuration is reported as *not configured* with the
missing names listed in the API and the settings UI. The local deterministic
adapter remains in use until the relevant variables are present and the key
parses.

## Provider precedence

`resolveProvider()` picks, in order:

1. `hedera-contract` — operator id, key and `HEDERA_CONTRACT_ID` present.
2. `hedera-hcs` — operator id, key and `HEDERA_TOPIC_ID` present.
3. `local` — deterministic local reference, explicitly not on-chain.

The precedence is a pure function (`chooseProviderId`) with unit tests, so the
order cannot change by accident.

## Status semantics

| Status | Meaning |
| --- | --- |
| `local` | No Hedera configuration. A deterministic local reference, explicitly not on-chain. |
| `confirmed` (contract) | `submitRoot` returned `SUCCESS` **and** `getRoot(batchId)` read back the submitted root. |
| `confirmed` (consensus) | The SDK received a receipt with a topic sequence number. |
| `failed` | A configured submit did not reach a receipt. No anchor row is written for batches; a certificate keeps its signature and says the anchor failed. |
| `unavailable` | Only used for certificates when consensus anchoring is not configured. |

`confirmed` is never written from a transaction id alone. For the contract path
the code waits for the receipt, requires `Status.Success`, then performs a read
back; a mismatch throws and no anchor row is written. The old placeholder that
recorded a `pending:` reference for an unsubmitted transaction has been removed:
a reference without a receipt is not an anchor.

## Where the receipt is stored

`blockchain_anchors` holds `provider`, `contract_id`, `contract_batch_id`,
`tx_ref` and `consensus_timestamp` for contract anchors, and `topic_id`,
`sequence_number`, `consensus_timestamp` for consensus anchors. Certificates store
`anchor_topic_id`, `anchor_sequence`, `anchor_tx_ref`, `anchor_network` and
`anchor_status`.

The settings → Integrity panel shows the active provider, the contract id, the
transaction reference and a HashScan link per batch. The public certificate page
shows the consensus anchor and attempts an independent mirror-node read.

## Independent verification

Contract anchor, no credentials required:

1. Open `https://hashscan.io/<network>/contract/<contractId>` — state, calls and
   the `RootSubmitted` events are visible.
2. Read the root yourself through the public JSON-RPC relay. Get the EVM address
   from the mirror node, then call the `getRoot(uint256)` selector `0x9b24b3b0`
   with the decimal on-chain batch key (shown beside the anchor in the settings
   panel) left-padded to 32 bytes:

   ```bash
   curl -s "https://testnet.mirrornode.hedera.com/api/v1/contracts/<contractId>" | grep evm_address
   curl -s https://testnet.hashio.io/api -H 'content-type: application/json' -d '{
     "jsonrpc":"2.0","id":1,"method":"eth_call",
     "params":[{"to":"<evm_address>","data":"0x9b24b3b0<batchId padded to 64 hex>"},"latest"]
   }'
   ```

   The returned 32-byte word must equal the stored Merkle root.

Consensus anchor, no credentials required:

```bash
curl "https://testnet.mirrornode.hedera.com/api/v1/topics/<topic>/messages/<sequence>"
```

The `message` field is base64; decode it and compare `root` (batches) or `hash`
(certificates) with the stored value.

Inclusion proof — `POST /api/blockchain/verify` with `{ batchId, commitment }`
proves a specific commitment is inside the anchored root without revealing the
evidence, and re-reads the anchor from the network (`chain.checked`).

A network outage is reported as "could not be read", never as a failed anchor.

## Operational constraints

- **Operator key custody.** The key lives in the deployment environment. It can
  call `submitRoot` on the contract and submit to the topic; it cannot read
  private evidence because none is sent. Use a dedicated operator with a small
  balance.
- **`anchorer` role.** Deploying sets both `owner` and `anchorer` to the
  deployer. `setAnchorer` lets `owner` hand submission to a separate key without
  redeploying.
- **No submit key on the topic.** The setup script creates a topic without an HCS
  submit key. Add one before using a public topic.
- **Deletion.** Account deletion removes stored anchors, but a root already
  recorded by the contract, or ordered by HCS, cannot be recalled. The envelopes
  and contract state contain no personal data, which is what makes that
  acceptable.
- **Testnet resets.** Testnet state can be reset by the network operator. Anchors
  are test receipts, not permanent public records. Mainnet requires a deliberate
  decision and is not configured here.
- **Unaudited contract.** `EvidenceAnchor` is small and has no upgrade path, but
  it has not been audited. Do not present it as one.
- **Gas.** `submitRoot` is a single storage write; the adapter caps the call at
  250,000 gas rather than asking for a blank cheque.
- **No HTS token or NFT.** Certificate ownership is not represented as a token.

## Verification performed for this MVP

- Contract compilation: `pnpm contracts:build` with solc 0.8.26, artifact
  committed.
- Artifact/source consistency, selectors, bytes32 encoding and provider
  precedence: unit tests (pass).
- Provider selection and status reporting: exercised with Hedera unconfigured;
  the UI and API report `local` and name the missing variables.
- Real contract deployment and a real `submitRoot` call: **not executed** in
  this environment, because no Hedera operator credentials exist here. The code
  path is complete, but the first deployment and submission must be run by the
  operator with `pnpm contracts:deploy` and one batch.

That distinction matters: compiled bytecode is not a deployed contract, and a
transaction id is not a confirmed anchor.
