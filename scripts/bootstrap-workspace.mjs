import { existsSync } from "node:fs";
import { getRequiredNodeVersion, hasGlobalVp, repoRoot, runCommand } from "./vp-runtime.mjs";

const requiredNodeVersion = getRequiredNodeVersion();

if (!hasGlobalVp()) {
  console.error(
    [
      "Global Vite+ is required to bootstrap this repository.",
      'Install it first, for example with "npm install -g vite-plus", then rerun this script.',
    ].join(" "),
  );
  process.exit(1);
}

runCommand("vp", ["env", "install", requiredNodeVersion], { cwd: repoRoot });
runCommand("vp", ["env", "exec", "--node", requiredNodeVersion, "vp", "install"], {
  cwd: repoRoot,
});

if (!existsSync(new URL("../node_modules/vite-plus/bin/vp", import.meta.url))) {
  console.error("Bootstrap finished, but local vite-plus is still missing.");
  process.exit(1);
}
