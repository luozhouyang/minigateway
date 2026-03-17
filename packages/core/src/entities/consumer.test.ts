import { test, expect, beforeEach, afterEach, describe } from "vite-plus/test";
import { DatabaseService } from "../storage/database.js";
import { ConsumerRepository } from "./consumer.js";
import { runMigrations } from "../storage/migrations.js";
import { join } from "node:path";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";

describe("ConsumerRepository", () => {
  let tempDir: string;
  let dbPath: string;
  let db: DatabaseService;
  let repo: ConsumerRepository;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "consumer-repo-test-"));
    dbPath = join(tempDir, "test.db");
    db = new DatabaseService(dbPath);
    repo = new ConsumerRepository(db);

    runMigrations(db);
  });

  afterEach(() => {
    db.close();
    rmSync(tempDir, { recursive: true, force: true });
  });

  test("creates a consumer", async () => {
    const consumer = await repo.create({
      username: "test-user",
      customId: "custom-123",
      tags: ["test"],
    });

    expect(consumer.username).toBe("test-user");
    expect(consumer.customId).toBe("custom-123");
    expect(consumer.id).toBeDefined();
  });

  test("finds consumer by id", async () => {
    const created = await repo.create({
      username: "test-user",
      customId: "custom-123",
      tags: [] as string[],
    });

    const found = await repo.findById(created.id);

    expect(found).toBeDefined();
    expect(found?.id).toBe(created.id);
    expect(found?.username).toBe("test-user");
  });

  test("finds consumer by username", async () => {
    await repo.create({
      username: "unique-user",
      customId: "custom-456",
      tags: [] as string[],
    });

    const found = await repo.findByUsername("unique-user");

    expect(found).toBeDefined();
    expect(found?.username).toBe("unique-user");
  });

  test("finds consumer by customId", async () => {
    await repo.create({
      username: "test-user",
      customId: "unique-custom-id",
      tags: [] as string[],
    });

    const found = await repo.findByCustomId("unique-custom-id");

    expect(found).toBeDefined();
    expect(found?.customId).toBe("unique-custom-id");
  });

  test("returns null for non-existent consumer", async () => {
    const found = await repo.findByUsername("non-existent");
    expect(found).toBeNull();
  });

  test("finds all consumers", async () => {
    await repo.create({
      username: "user-1",
      customId: "custom-1",
      tags: [] as string[],
    });
    await repo.create({
      username: "user-2",
      customId: "custom-2",
      tags: [] as string[],
    });

    const consumers = await repo.findAll();

    expect(consumers).toHaveLength(2);
  });

  test("updates a consumer", async () => {
    const created = await repo.create({
      username: "test-user",
      customId: "custom-123",
      tags: [] as string[],
    });

    const updated = await repo.update(created.id, {
      username: "updated-user",
      tags: ["updated"],
    });

    expect(updated.username).toBe("updated-user");
    expect(updated.tags).toContain("updated");
  });

  test("deletes a consumer", async () => {
    const created = await repo.create({
      username: "test-user",
      customId: "custom-123",
      tags: [] as string[],
    });

    const deleted = await repo.delete(created.id);

    expect(deleted).toBe(true);
    expect(await repo.findById(created.id)).toBeNull();
  });
});
