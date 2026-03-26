import { test, expect, beforeEach, afterEach, describe } from "vite-plus/test";
import { DatabaseService } from "./database.js";
import { Repository } from "./repository.js";
import { join } from "node:path";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { sqliteTable, text } from "drizzle-orm/sqlite-core";
import { eq } from "drizzle-orm";

// Simple table for testing
const testTable = sqliteTable("test_items", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  value: text("value"),
  createdAt: text("created_at"),
  updatedAt: text("updated_at"),
});

interface TestItem {
  id: string;
  name: string;
  value?: string | null;
  createdAt: string;
  updatedAt: string;
}

class TestRepository extends Repository<TestItem> {
  constructor(db: DatabaseService) {
    super(db, testTable);
  }

  async findByName(name: string): Promise<TestItem | null> {
    return this.findFirst(eq(testTable.name, name));
  }
}

describe("Repository", () => {
  let tempDir: string;
  let dbPath: string;
  let db: DatabaseService;
  let repo: TestRepository;

  beforeEach(async () => {
    tempDir = mkdtempSync(join(tmpdir(), "repo-test-"));
    dbPath = join(tempDir, "test.db");
    db = new DatabaseService(dbPath);
    repo = new TestRepository(db);

    // Create test table
    await db.getRawDatabase().executeMultiple(`
      CREATE TABLE IF NOT EXISTS test_items (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        value TEXT,
        created_at TEXT,
        updated_at TEXT
      )
    `);
  });

  afterEach(() => {
    db.close();
    rmSync(tempDir, { recursive: true, force: true });
  });

  test("creates entity", async () => {
    const item = await repo.create({
      id: "test-1",
      name: "Test Item",
      value: "test-value",
    });

    expect(item.id).toBe("test-1");
    expect(item.name).toBe("Test Item");
    expect(item.value).toBe("test-value");
  });

  test("finds entity by id", async () => {
    const created = await repo.create({
      id: "test-1",
      name: "Test Item",
      value: "test-value",
    });

    const found = await repo.findById("test-1");

    expect(found).toBeDefined();
    expect(found?.id).toBe(created.id);
  });

  test("returns null for non-existent id", async () => {
    const found = await repo.findById("non-existent");
    expect(found).toBeNull();
  });

  test("finds all entities", async () => {
    await repo.create({
      id: "test-1",
      name: "Item 1",
      value: "value-1",
    });
    await repo.create({
      id: "test-2",
      name: "Item 2",
      value: "value-2",
    });

    const items = await repo.findAll();

    expect(items).toHaveLength(2);
  });

  test("updates entity", async () => {
    const created = await repo.create({
      id: "test-1",
      name: "Test Item",
      value: "original",
    });

    const updated = await repo.update("test-1", {
      value: "updated",
    });

    expect(updated.value).toBe("updated");
    expect(updated.id).toBe(created.id);
  });

  test("deletes entity", async () => {
    await repo.create({
      id: "test-1",
      name: "Test Item",
      value: "test-value",
    });

    const deleted = await repo.delete("test-1");

    expect(deleted).toBe(true);
    expect(await repo.findById("test-1")).toBeNull();
  });

  test("finds first entity matching condition", async () => {
    await repo.create({
      id: "test-1",
      name: "Unique Item",
      value: "test-value",
    });

    const found = await repo.findByName("Unique Item");

    expect(found).toBeDefined();
    expect(found?.name).toBe("Unique Item");
  });
});
