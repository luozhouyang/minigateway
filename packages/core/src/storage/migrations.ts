import { createClient } from "@libsql/client";
import { migrate } from "drizzle-orm/libsql/migrator";
import * as fs from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PluginLoader } from "../plugins/plugin-loader.js";
import { runPluginMigrations } from "../plugins/plugin-migration-runner.js";
import type { PluginDefinition } from "../plugins/types.js";
import { createDatabase } from "./database.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface RunMigrationsOptions {
  plugins?: PluginDefinition[];
}

/**
 * Run database migrations using Drizzle ORM
 * The migrations folder location depends on whether we're running from source or bundled:
 * - Source: src/storage/ -> ../../drizzle
 * - Bundled: dist/storage/ -> ../drizzle
 */
export async function runMigrations(dbPath: string, options?: RunMigrationsOptions): Promise<void> {
  const client = createClient({ url: `file:${dbPath}` });
  const db = createDatabase(client);

  // Try bundled path first (dist/storage -> ../drizzle), then source path (src/storage -> ../../drizzle)
  let migrationsFolder = join(__dirname, "../drizzle");
  try {
    const stat = fs.statSync(migrationsFolder);
    if (!stat.isDirectory()) {
      throw new Error("Not a directory");
    }
  } catch {
    // Fall back to source path
    migrationsFolder = join(__dirname, "../../drizzle");
  }

  try {
    await migrate(db, { migrationsFolder });

    const pluginDefinitions = options?.plugins ?? new PluginLoader().listBuiltinDefinitions();
    await runPluginMigrations(client, pluginDefinitions);
  } finally {
    client.close();
  }
}
