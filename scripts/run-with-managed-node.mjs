const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("Usage: node ./scripts/run-with-managed-node.mjs <script> [args...]");
  process.exit(1);
}

const { resolveProjectNode, runCommand } = await import("./vp-runtime.mjs");
const node = resolveProjectNode();
runCommand(node, args, { cwd: process.cwd() });
