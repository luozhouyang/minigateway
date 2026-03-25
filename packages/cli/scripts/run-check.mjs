import { rmSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { runLocalVp } from "../../../scripts/vp-runtime.mjs";

const packageDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

rmSync(path.join(packageDir, "dist"), { force: true, recursive: true });
runLocalVp(["check"], { cwd: packageDir });
runLocalVp(["pack", "src/cli/index.ts"], { cwd: packageDir });
