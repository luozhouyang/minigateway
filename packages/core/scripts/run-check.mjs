import { rmSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { runLocalVp, runCommand } from "../../../scripts/vp-runtime.mjs";

const packageDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

rmSync(path.join(packageDir, "dist"), { force: true, recursive: true });
runLocalVp(["check"], { cwd: packageDir });
runLocalVp(["pack", "src/index.ts"], { cwd: packageDir });
runCommand(process.execPath, ["./scripts/copy-drizzle.mjs"], { cwd: packageDir });
