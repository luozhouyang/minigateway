import { spawnSync } from "node:child_process";
import path from "path";
import { fileURLToPath } from "url";
import { embedWebAssets } from "./embed-web-assets.mjs";

const packageDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(packageDir, "../..");

function runVp(args, options = {}) {
  const { cwd = repoRoot } = options;
  const result = spawnSync("vp", args, {
    cwd,
    stdio: "inherit",
    shell: false,
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }

  return result;
}

runVp(["run", "@minigateway/core#build"], { cwd: repoRoot });
runVp(["run", "web#build"], { cwd: repoRoot });
runVp(["pack", "src/cli/index.ts"], { cwd: packageDir });
embedWebAssets();
