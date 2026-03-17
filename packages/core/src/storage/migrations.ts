import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import Database from "better-sqlite3";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Run database migrations using Drizzle ORM
 */
export function runMigrations(dbPath: string): void {
  const client = new Database(dbPath);
  const db = drizzle(client);

  const migrationsFolder = join(__dirname, "../../drizzle");
  migrate(db, { migrationsFolder });

  client.close();
}
