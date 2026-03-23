import { spawnSync } from "child_process";
import { rmSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const packageDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(packageDir, "../..");
const vpCli = path.join(repoRoot, "node_modules/vite-plus/bin/vp");

function run(args) {
  const result = spawnSync(process.execPath, [vpCli, ...args], {
    cwd: packageDir,
    stdio: "inherit",
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

rmSync(path.join(packageDir, "dist"), { force: true, recursive: true });
run(["check"]);
run(["pack", "src/cli/index.ts"]);
