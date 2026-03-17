import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "./schema.js";

export class DatabaseService {
  private client: Database.Database;
  public db: ReturnType<typeof drizzle<typeof schema>>;

  constructor(dbPath: string) {
    this.client = new Database(dbPath);
    this.client.pragma("journal_mode = WAL");
    this.db = drizzle(this.client, { schema });
  }

  getRawDatabase(): Database.Database {
    return this.client;
  }

  getDrizzleDb(): ReturnType<typeof drizzle<typeof schema>> {
    return this.db;
  }

  close(): void {
    this.client.close();
  }
}
