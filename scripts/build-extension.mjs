#!/usr/bin/env node
/**
 * Builds the Manifest V3 extension into apps/extension/dist.
 * The extension is dependency-free, so the build is a validated copy.
 */
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const source = path.join(root, "apps/extension/src");
const output = path.join(root, "apps/extension/dist");

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(source, output, { recursive: true });

const manifestPath = path.join(output, "manifest.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));

const required = ["background.js", "popup.html", "popup.js", "popup.css"];
for (const file of required) {
  await readFile(path.join(output, file));
}

if (manifest.manifest_version !== 3) {
  throw new Error("manifest.json must declare manifest_version 3");
}

const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
manifest.version = packageJson.version.split("-")[0];
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

console.log(`[repuh] extension built → ${path.relative(root, output)} (v${manifest.version})`);
