/**
 * Compiles both Solidity contracts into contracts/artifacts/.
 *
 * The artifact is committed so the deployment script and the application never
 * need a Solidity compiler at runtime, and so a reader can check that the
 * bytecode deployed on Hedera is the bytecode derived from this source.
 *
 * Run with: pnpm contracts:build
 */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const solc = require("solc");

const root = path.resolve(import.meta.dirname, "..");
for (const contractName of ["EvidenceAnchor", "CertificateRegistry"]) {
  const sourcePath = path.join(root, "contracts", `${contractName}.sol`);
  const artifactPath = path.join(root, "contracts", "artifacts", `${contractName}.json`);
  const source = readFileSync(sourcePath, "utf8");

  const input = {
    language: "Solidity",
    sources: { [`${contractName}.sol`]: { content: source } },
    settings: {
      optimizer: { enabled: true, runs: 200 },
      // Hedera's EVM does not guarantee the newest opcodes. London keeps the
      // bytecode free of PUSH0, which is the usual deployment failure.
      evmVersion: "london",
      outputSelection: {
        "*": {
          "*": ["abi", "evm.bytecode.object", "evm.deployedBytecode.object", "evm.methodIdentifiers"],
        },
      },
    },
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input)));
  const errors = (output.errors ?? []).filter((entry) => entry.severity === "error");
  if (errors.length > 0) {
    for (const error of errors) console.error(error.formattedMessage);
    process.exitCode = 1;
    throw new Error(`${contractName}.sol did not compile`);
  }

  const contract = output.contracts?.[`${contractName}.sol`]?.[contractName];
  if (!contract) throw new Error(`Compiled output did not contain ${contractName}`);

  const bytecode = contract.evm.bytecode.object;
  const deployedBytecode = contract.evm.deployedBytecode.object;
  if (!bytecode) throw new Error(`${contractName} compiled to empty bytecode`);

  const artifact = {
    contractName,
    source: `contracts/${contractName}.sol`,
    sourceSha256: createHash("sha256").update(source).digest("hex"),
    compiler: solc.version(),
    evmVersion: "london",
    optimizer: { enabled: true, runs: 200 },
    abi: contract.abi,
    bytecode: `0x${bytecode}`,
    deployedBytecode: `0x${deployedBytecode}`,
    methodIdentifiers: contract.evm.methodIdentifiers,
  };

  mkdirSync(path.dirname(artifactPath), { recursive: true });
  writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`);

  console.log(`[repuh] wrote ${path.relative(root, artifactPath)}`);
  console.log(`[repuh] compiler ${artifact.compiler} · ${bytecode.length / 2} bytes of runtime-free init code`);
  for (const [signature, selector] of Object.entries(artifact.methodIdentifiers)) {
    console.log(`[repuh] ${signature} → ${selector}`);
  }

}
