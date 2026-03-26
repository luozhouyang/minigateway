// Admin API Test Utilities

import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { Hono } from "hono";
import { runMigrations } from "../storage/migrations.js";
import { DatabaseService } from "../storage/database.js";
import { createAdminApi } from "./server.js";

export interface TestContext {
  tempDir: string;
  dbPath: string;
  db: DatabaseService;
  app: Hono;
}

export async function createTestContext(): Promise<TestContext> {
  const tempDir = mkdtempSync(join(tmpdir(), "admin-api-test-"));
  const dbPath = join(tempDir, "test.db");

  await runMigrations(dbPath);
  const db = new DatabaseService(dbPath);

  // Create admin API (routes at root level)
  const adminApi = createAdminApi({ db });

  // Wrap in a root Hono app and mount at /admin for testing
  const app = new Hono();
  app.route("/admin", adminApi);

  return {
    tempDir,
    dbPath,
    db,
    app,
  };
}

export function destroyTestContext(ctx: TestContext) {
  ctx.db.close();
  rmSync(ctx.tempDir, { recursive: true, force: true });
}
