import { test, expect, beforeEach, afterEach, describe } from "vite-plus/test";
import { DatabaseService } from "./database";
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

  test("initializes with WAL mode", () => {
    db = new DatabaseService(dbPath);
    const result = db.getRawDatabase().pragma("journal_mode", { simple: true }) as string;
    expect(result).toBe("wal");
  });

  test("closes database connection without error", () => {
    db = new DatabaseService(dbPath);
    expect(() => db.close()).not.toThrow();
    // After close, the database should be closed
    expect(() => db.getRawDatabase().prepare("SELECT 1").get()).toThrow();
  });

  test("provides access to drizzle db instance", () => {
    db = new DatabaseService(dbPath);
    expect(db.getDrizzleDb()).toBeDefined();
  });
});
