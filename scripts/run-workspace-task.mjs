import { listWorkspacePackages, repoRoot, runLocalVp } from "./vp-runtime.mjs";

const [task, ...additionalArgs] = process.argv.slice(2);

if (!task) {
  console.error("Usage: node ./scripts/run-workspace-task.mjs <task> [args...]");
  process.exit(1);
}

const packages = listWorkspacePackages().filter((pkg) => typeof pkg.scripts[task] === "string");
const packagesByName = new Map(packages.map((pkg) => [pkg.name, pkg]));
const inDegree = new Map(packages.map((pkg) => [pkg.name, 0]));
const outgoing = new Map(packages.map((pkg) => [pkg.name, []]));

for (const pkg of packages) {
  const internalDependencies = Object.keys(pkg.dependencies).filter((dependencyName) =>
    packagesByName.has(dependencyName),
  );

  inDegree.set(pkg.name, internalDependencies.length);

  for (const dependencyName of internalDependencies) {
    outgoing.get(dependencyName).push(pkg.name);
  }
}

function comparePackages(leftName, rightName) {
  const left = packagesByName.get(leftName);
  const right = packagesByName.get(rightName);

  if (left.workspaceIndex !== right.workspaceIndex) {
    return left.workspaceIndex - right.workspaceIndex;
  }

  return left.relativeDir.localeCompare(right.relativeDir);
}

const ready = [...inDegree.entries()]
  .filter(([, degree]) => degree === 0)
  .map(([name]) => name)
  .sort(comparePackages);
const orderedNames = [];

while (ready.length > 0) {
  const currentName = ready.shift();
  orderedNames.push(currentName);

  for (const dependentName of outgoing.get(currentName)) {
    const nextDegree = inDegree.get(dependentName) - 1;
    inDegree.set(dependentName, nextDegree);

    if (nextDegree === 0) {
      ready.push(dependentName);
      ready.sort(comparePackages);
    }
  }
}

if (orderedNames.length !== packages.length) {
  const remaining = packages
    .map((pkg) => pkg.name)
    .filter((name) => !orderedNames.includes(name))
    .sort(comparePackages);
  orderedNames.push(...remaining);
}

for (const packageName of orderedNames) {
  runLocalVp(["run", `${packageName}#${task}`, ...additionalArgs], {
    cwd: repoRoot,
  });
}
