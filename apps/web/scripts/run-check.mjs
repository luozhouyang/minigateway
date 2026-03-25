import { readdirSync, statSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { runLocalVp } from "../../../scripts/vp-runtime.mjs";

const packageDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const excludedRelativePaths = new Set(["src/routeTree.gen.ts"]);

function collectFiles(currentDir) {
  const entries = readdirSync(currentDir, { withFileTypes: true });
  const collectedFiles = [];

  for (const entry of entries) {
    const absolutePath = path.join(currentDir, entry.name);
    const relativePath = path.relative(packageDir, absolutePath);

    if (excludedRelativePaths.has(relativePath)) {
      continue;
    }

    if (entry.isDirectory()) {
      collectedFiles.push(...collectFiles(absolutePath));
      continue;
    }

    if (!statSync(absolutePath).isFile()) {
      continue;
    }

    collectedFiles.push(relativePath);
  }

  return collectedFiles;
}

const filesToCheck = [
  "package.json",
  "tsconfig.json",
  "vite.config.ts",
  ...collectFiles(path.join(packageDir, "src")),
];
runLocalVp(["check", ...filesToCheck], { cwd: packageDir });
