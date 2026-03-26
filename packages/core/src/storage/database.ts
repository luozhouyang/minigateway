import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema.js";
import type { Database, DatabaseClient } from "./types.js";

export function createDatabase(client: DatabaseClient): Database {
  return drizzle(client, { schema });
}

export class DatabaseService {
  private readonly client: DatabaseClient;
  public readonly db: Database;

  constructor(dbPath: string) {
    this.client = createClient({ url: `file:${dbPath}` });
    this.db = createDatabase(this.client);
  }

  getRawDatabase(): DatabaseClient {
    return this.client;
  }

  getDatabase(): Database {
    return this.db;
  }

  getDrizzleDb(): Database {
    return this.getDatabase();
  }

  close(): void {
    this.client.close();
  }
}
