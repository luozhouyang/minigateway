import { existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { runLocalVp } from "./vp-runtime.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const stagedFiles = process.argv.slice(2).map((filePath) => filePath.replaceAll("\\", "/"));

function hasStagedFilesIn(prefix) {
  return stagedFiles.some((filePath) => filePath.startsWith(prefix));
}

function getRootFilesToCheck() {
  return stagedFiles.filter((filePath) => {
    if (
      filePath.startsWith("apps/web/") ||
      filePath.startsWith("packages/core/") ||
      filePath.startsWith("packages/cli/")
    ) {
      return false;
    }

    return existsSync(path.join(repoRoot, filePath));
  });
}

if (hasStagedFilesIn("apps/web/")) {
  runLocalVp(["exec", "node", "./scripts/run-check.mjs"], { cwd: path.join(repoRoot, "apps/web") });
}

if (hasStagedFilesIn("packages/core/")) {
  runLocalVp(["exec", "node", "./scripts/run-check.mjs"], {
    cwd: path.join(repoRoot, "packages/core"),
  });
}

if (hasStagedFilesIn("packages/cli/")) {
  runLocalVp(["exec", "node", "./scripts/run-check.mjs"], {
    cwd: path.join(repoRoot, "packages/cli"),
  });
}

const rootFilesToCheck = getRootFilesToCheck();

if (rootFilesToCheck.length > 0) {
  runLocalVp(["check", "--fix", ...rootFilesToCheck], { cwd: repoRoot });
}
