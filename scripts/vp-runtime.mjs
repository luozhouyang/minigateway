import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const localVpCli = path.join(repoRoot, "node_modules", "vite-plus", "bin", "vp");

export function getRequiredNodeVersion() {
  return readFileSync(path.join(repoRoot, ".node-version"), "utf8").trim();
}

export function normalizeNodeVersion(version) {
  return version.replace(/^v/, "").trim();
}

export function getManagedNodePath(version = getRequiredNodeVersion()) {
  const vitePlusHome = process.env.VITE_PLUS_HOME || path.join(os.homedir(), ".vite-plus");
  return path.join(vitePlusHome, "js_runtime", "node", version, "bin", "node");
}

export function hasGlobalVp() {
  const result = spawnSync("vp", ["--version"], {
    cwd: repoRoot,
    stdio: "ignore",
  });

  return !result.error && result.status === 0;
}

export function installManagedNode(version = getRequiredNodeVersion()) {
  if (!hasGlobalVp()) {
    return false;
  }

  const result = spawnSync("vp", ["env", "install", version], {
    cwd: repoRoot,
    stdio: "inherit",
  });

  if (result.error) {
    throw result.error;
  }

  return result.status === 0;
}

export function resolveProjectNode(options = {}) {
  const { autoInstall = true } = options;
  const requiredVersion = getRequiredNodeVersion();

  if (normalizeNodeVersion(process.version) === requiredVersion) {
    return process.execPath;
  }

  const managedNode = getManagedNodePath(requiredVersion);
  if (existsSync(managedNode)) {
    return managedNode;
  }

  if (autoInstall && installManagedNode(requiredVersion) && existsSync(managedNode)) {
    return managedNode;
  }

  const instructions = hasGlobalVp()
    ? `Run "vp env install ${requiredVersion}" or switch your current Node.js to ${requiredVersion}.`
    : `Install Vite+ globally first, then run "vp env install ${requiredVersion}".`;

  throw new Error(
    `Unable to resolve Node.js ${requiredVersion} for this repository. ${instructions}`,
  );
}

export function ensureLocalVpInstalled() {
  if (existsSync(localVpCli)) {
    return;
  }

  throw new Error(
    `Local vite-plus CLI was not found at ${localVpCli}. Run "node ./scripts/bootstrap-workspace.mjs" or "vp install" from the repository root first.`,
  );
}

export function runCommand(command, args, options = {}) {
  const { cwd = repoRoot, env = process.env } = options;
  const result = spawnSync(command, args, {
    cwd,
    env,
    stdio: "inherit",
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }

  return result;
}

export function runLocalVp(args, options = {}) {
  const { cwd = process.cwd(), autoInstallNode = true } = options;
  ensureLocalVpInstalled();
  const node = resolveProjectNode({ autoInstall: autoInstallNode });

  return runCommand(node, [localVpCli, ...args], { cwd });
}

export function listWorkspacePackages() {
  const rootPackageJson = JSON.parse(
    readFileSync(path.join(repoRoot, "package.json"), "utf8"),
  );
  const workspacePatterns = Array.isArray(rootPackageJson.workspaces)
    ? rootPackageJson.workspaces
    : [];

  return workspacePatterns.flatMap((pattern, workspaceIndex) => {
    if (!pattern.endsWith("/*")) {
      return [];
    }

    const baseDir = pattern.slice(0, -2);
    const absoluteBaseDir = path.join(repoRoot, baseDir);

    if (!existsSync(absoluteBaseDir)) {
      return [];
    }

    return readdirSync(absoluteBaseDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.join(absoluteBaseDir, entry.name, "package.json"))
      .filter((packageJsonPath) => existsSync(packageJsonPath))
      .map((packageJsonPath) => {
        const packageDir = path.dirname(packageJsonPath);
        const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));

        return {
          name: packageJson.name,
          dir: packageDir,
          relativeDir: path.relative(repoRoot, packageDir),
          scripts: packageJson.scripts ?? {},
          dependencies: {
            ...(packageJson.dependencies ?? {}),
            ...(packageJson.devDependencies ?? {}),
            ...(packageJson.optionalDependencies ?? {}),
          },
          workspaceIndex,
        };
      });
  });
}
