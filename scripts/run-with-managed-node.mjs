import { existsSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const nodeVersion = readFileSync(path.join(repoRoot, ".node-version"), "utf-8").trim();
const vitePlusHome = process.env.VITE_PLUS_HOME || path.join(os.homedir(), ".vite-plus");
const managedNode = path.join(vitePlusHome, "js_runtime", "node", nodeVersion, "bin", "node");

if (!existsSync(managedNode)) {
  console.error(`Managed Node.js ${nodeVersion} is not installed at ${managedNode}`);
  process.exit(1);
}

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("Usage: node ./scripts/run-with-managed-node.mjs <script> [args...]");
  process.exit(1);
}

const result = spawnSync(managedNode, args, {
  cwd: process.cwd(),
  stdio: "inherit",
});

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
