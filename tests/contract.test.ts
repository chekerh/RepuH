import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import path from "node:path";
import { bytes32ToRoot, rootToBytes32 } from "../src/lib/hedera/contract.ts";
import { chooseProviderId } from "../src/lib/blockchain/index.ts";

const ROOT = path.resolve(process.cwd(), "contracts");
const artifact = JSON.parse(
  readFileSync(path.join(ROOT, "artifacts/EvidenceAnchor.json"), "utf8"),
) as {
  contractName: string;
  sourceSha256: string;
  bytecode: string;
  abi: Array<{ type: string; name?: string; inputs?: unknown[] }>;
  methodIdentifiers: Record<string, string>;
};

test("the committed artifact is compiled from the committed source", () => {
  const source = readFileSync(path.join(ROOT, "EvidenceAnchor.sol"), "utf8");
  assert.equal(
    createHash("sha256").update(source).digest("hex"),
    artifact.sourceSha256,
    "run `pnpm contracts:build` after editing EvidenceAnchor.sol",
  );
  assert.equal(artifact.contractName, "EvidenceAnchor");
  assert.ok(artifact.bytecode.startsWith("0x") && artifact.bytecode.length > 2);
});

test("the artifact exposes the functions the adapter calls", () => {
  const names = artifact.abi.filter((entry) => entry.type === "function").map((entry) => entry.name);
  for (const name of ["submitRoot", "getRoot", "rootExists", "setAnchorer"]) {
    assert.ok(names.includes(name), `${name} is missing from the ABI`);
  }
  // The selectors pin the exact signatures; a changed argument type is a
  // different function, not a compatible one.
  assert.equal(artifact.methodIdentifiers["submitRoot(bytes32,uint256)"], "5e4c087d");
  assert.equal(artifact.methodIdentifiers["getRoot(uint256)"], "9b24b3b0");
  assert.equal(artifact.methodIdentifiers["rootExists(uint256)"], "76a5cef3");
});

test("a root round-trips through the bytes32 encoding used on-chain", () => {
  const root = "0123456789abcdef".repeat(4);
  assert.equal(bytes32ToRoot(rootToBytes32(root)), root);
  assert.equal(rootToBytes32(root).length, 32);
});

test("a malformed root never reaches a contract call", () => {
  for (const value of ["", "abc", "Z".repeat(64), "a".repeat(63), "A".repeat(64)]) {
    assert.throws(() => rootToBytes32(value), /64 lowercase hex/);
  }
});

test("the contract is the preferred anchor path when it is configured", () => {
  assert.equal(chooseProviderId({ contractReady: true, consensusReady: true }), "hedera-contract");
  assert.equal(chooseProviderId({ contractReady: false, consensusReady: true }), "hedera-hcs");
  assert.equal(chooseProviderId({ contractReady: false, consensusReady: false }), "local");
});
