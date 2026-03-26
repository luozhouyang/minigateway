import { test, expect, beforeEach, afterEach, describe } from "vite-plus/test";
import { DatabaseService } from "./database.js";
import { join } from "node:path";
import { mkdtempSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";

describe("DatabaseService", () => {
  let tempDir: string;
  let dbPath: string;
  let db: DatabaseService;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "proxy-engine-test-"));
    dbPath = join(tempDir, "test.db");
  });

  afterEach(() => {
    db?.close();
    rmSync(tempDir, { recursive: true, force: true });
  });

  test("creates database file on initialization", () => {
    db = new DatabaseService(dbPath);
    expect(existsSync(dbPath)).toBe(true);
  });

  test("creates a file-backed libsql client", () => {
    db = new DatabaseService(dbPath);
    expect(db.getRawDatabase().protocol).toBe("file");
  });

  test("closes database connection without error", () => {
    db = new DatabaseService(dbPath);
    expect(() => db.close()).not.toThrow();
    expect(db.getRawDatabase().closed).toBe(true);
  });

  test("provides access to drizzle db instance", () => {
    db = new DatabaseService(dbPath);
    expect(db.getDatabase()).toBeDefined();
  });
});
