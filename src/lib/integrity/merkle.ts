/**
 * Integrity primitives.
 *
 * Evidence stays off-chain and private. What leaves the system is a batch
 * Merkle root over deterministic commitments. The commitment deliberately
 * excludes usernames, emails, scores, project identifiers and raw payloads.
 */

import { createHash } from "node:crypto";

export const HASH_VERSION = "repuh-evidence-v1";

export function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

/** Deterministic JSON: object keys sorted, arrays preserved. */
export function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${JSON.stringify(k)}:${canonicalize(v)}`);
  return `{${entries.join(",")}}`;
}

export interface CommitmentInput {
  evidenceId: string;
  signal: string;
  occurredAt: string;
  /** Digest of the classified record — never the record itself. */
  contentHash: string;
}

export function evidenceCommitment(input: CommitmentInput): string {
  return sha256Hex(
    canonicalize({
      v: HASH_VERSION,
      e: input.evidenceId,
      s: input.signal,
      t: input.occurredAt,
      c: input.contentHash,
    }),
  );
}

export function leafHash(commitment: string): string {
  return sha256Hex(`leaf:${commitment}`);
}

export function parentHash(left: string, right: string): string {
  return sha256Hex(`node:${left}${right}`);
}

export interface MerkleTree {
  leaves: string[];
  layers: string[][];
  root: string;
}

export function buildMerkleTree(commitments: string[]): MerkleTree {
  if (commitments.length === 0) {
    throw new Error("Cannot build a Merkle tree with no commitments");
  }
  const leaves = commitments.map(leafHash);
  const layers: string[][] = [leaves];
  let current = leaves;

  while (current.length > 1) {
    const next: string[] = [];
    for (let index = 0; index < current.length; index += 2) {
      const left = current[index]!;
      const right = current[index + 1] ?? left;
      next.push(parentHash(left, right));
    }
    layers.push(next);
    current = next;
  }

  return { leaves, layers, root: current[0]! };
}

export interface MerkleProof {
  /** Sibling hashes from leaf level upward. */
  path: Array<{ position: "left" | "right"; hash: string }>;
  root: string;
  leaf: string;
  index: number;
}

export function merkleProof(tree: MerkleTree, index: number): MerkleProof {
  if (index < 0 || index >= tree.leaves.length) {
    throw new Error("Leaf index out of range");
  }
  const path: MerkleProof["path"] = [];
  let cursor = index;

  for (let layer = 0; layer < tree.layers.length - 1; layer += 1) {
    const nodes = tree.layers[layer]!;
    const isRight = cursor % 2 === 1;
    const siblingIndex = isRight ? cursor - 1 : cursor + 1;
    const sibling = nodes[siblingIndex] ?? nodes[cursor]!;
    path.push({ position: isRight ? "left" : "right", hash: sibling });
    cursor = Math.floor(cursor / 2);
  }

  return {
    path,
    root: tree.root,
    leaf: tree.leaves[index]!,
    index,
  };
}

export function verifyProof(proof: MerkleProof): boolean {
  let cursor = proof.leaf;
  for (const step of proof.path) {
    cursor =
      step.position === "left" ? parentHash(step.hash, cursor) : parentHash(cursor, step.hash);
  }
  return cursor === proof.root;
}

/** Hash a classified evidence record without retaining personal data. */
export function contentCommitment(record: {
  signal: string;
  occurredAt: string;
  skillIds: string[];
  quality: number;
}): string {
  return sha256Hex(
    canonicalize({
      v: HASH_VERSION,
      s: record.signal,
      t: record.occurredAt,
      k: [...record.skillIds].sort(),
      q: record.quality,
    }),
  );
}
