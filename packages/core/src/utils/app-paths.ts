// App Paths - Unified configuration and database path management

import { join } from "path";
import { existsSync, mkdirSync } from "fs";
import { homedir } from "os";

/**
 * Get the user's default config directory path based on the operating system.
 *
 * Platform-specific paths:
 * - Linux: ~/.config/minigateway
 * - macOS: ~/Library/Application Support/minigateway
 * - Windows: ~\AppData\Roaming\minigateway
 */
export function getConfigDir(): string {
  const home = homedir();
  const platform = process.platform;

  let configDir: string;

  if (platform === "win32") {
    // Windows: ~\AppData\Roaming\minigateway
    configDir = join(process.env.APPDATA || home, "minigateway");
  } else if (platform === "darwin") {
    // macOS: ~/Library/Application Support/minigateway
    configDir = join(home, "Library", "Application Support", "minigateway");
  } else {
    // Linux and others: ~/.config/minigateway
    configDir = join(home, ".config", "minigateway");
  }

  // Ensure directory exists
  ensureDirExists(configDir);

  return configDir;
}

/**
 * Get the default configuration file path.
 * @returns The full path to the configuration file
 */
export function getConfigPath(): string {
  return join(getConfigDir(), "config.yaml");
}

/**
 * Get the default database file path.
 * @returns The full path to the database file
 */
export function getDatabasePath(): string {
  return join(getConfigDir(), "minigateway.db");
}

/**
 * Ensure a directory exists, creating it if necessary.
 */
function ensureDirExists(dirPath: string): void {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Get the CLI config file path (for admin API authentication).
 * @returns The full path to the CLI config file
 */
export function getCliConfigPath(): string {
  return join(getConfigDir(), "cli-config.json");
}
