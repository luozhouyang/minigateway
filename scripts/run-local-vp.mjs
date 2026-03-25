import { runLocalVp } from "./vp-runtime.mjs";

const args = process.argv.slice(2);

if (args.length === 0) {
  console.error("Usage: node ./scripts/run-local-vp.mjs <vp-args...>");
  process.exit(1);
}

runLocalVp(args);
