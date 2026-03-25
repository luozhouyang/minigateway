import path from "path";
import { fileURLToPath } from "url";
import { repoRoot, runLocalVp } from "../../../scripts/vp-runtime.mjs";
import { embedWebAssets } from "./embed-web-assets.mjs";

const packageDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const coreDir = path.join(repoRoot, "packages/core");
const webDir = path.join(repoRoot, "apps/web");

runLocalVp(["run", "@minigateway/core#build"], { cwd: repoRoot });
runLocalVp(["run", "web#build"], { cwd: repoRoot });
runLocalVp(["pack", "src/cli/index.ts"], { cwd: packageDir });
embedWebAssets();
