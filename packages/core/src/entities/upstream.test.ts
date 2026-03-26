import { test, expect, beforeEach, afterEach, describe } from "vite-plus/test";
import { DatabaseService } from "../storage/database.js";
import { UpstreamRepository } from "./upstream.js";
import { runMigrations } from "../storage/migrations.js";
import { join } from "node:path";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";

describe("UpstreamRepository", () => {
  let tempDir: string;
  let dbPath: string;
  let db: DatabaseService;
  let repo: UpstreamRepository;

  beforeEach(async () => {
    tempDir = mkdtempSync(join(tmpdir(), "upstream-repo-test-"));
    dbPath = join(tempDir, "test.db");
    await runMigrations(dbPath);
    db = new DatabaseService(dbPath);
    repo = new UpstreamRepository(db);
  });

  afterEach(() => {
    db.close();
    rmSync(tempDir, { recursive: true, force: true });
  });

  test("creates an upstream", async () => {
    const upstream = await repo.create({
      name: "test-upstream",
      algorithm: "round-robin",
      hashOn: "none",
      hashFallback: "none",
      slots: 10000,
      tags: ["test"],
    });

    expect(upstream.name).toBe("test-upstream");
    expect(upstream.algorithm).toBe("round-robin");
    expect(upstream.slots).toBe(10000);
    expect(upstream.id).toBeDefined();
  });

  test("finds upstream by id", async () => {
    const created = await repo.create({
      name: "test-upstream",
      algorithm: "round-robin",
      hashOn: "none",
      hashFallback: "none",
      slots: 10000,
      tags: [] as string[],
    });

    const found = await repo.findById(created.id);

    expect(found).toBeDefined();
    expect(found?.id).toBe(created.id);
    expect(found?.name).toBe("test-upstream");
  });

  test("finds upstream by name", async () => {
    await repo.create({
      name: "unique-upstream",
      algorithm: "round-robin",
      hashOn: "none",
      hashFallback: "none",
      slots: 10000,
      tags: [] as string[],
    });

    const found = await repo.findByName("unique-upstream");

    expect(found).toBeDefined();
    expect(found?.name).toBe("unique-upstream");
  });

  test("returns null for non-existent upstream", async () => {
    const found = await repo.findByName("non-existent");
    expect(found).toBeNull();
  });

  test("finds all upstreams", async () => {
    await repo.create({
      name: "upstream-1",
      algorithm: "round-robin",
      hashOn: "none",
      hashFallback: "none",
      slots: 10000,
      tags: [] as string[],
    });
    await repo.create({
      name: "upstream-2",
      algorithm: "least-connections",
      hashOn: "none",
      hashFallback: "none",
      slots: 5000,
      tags: [] as string[],
    });

    const upstreams = await repo.findAll();

    expect(upstreams).toHaveLength(2);
  });

  test("updates an upstream", async () => {
    const created = await repo.create({
      name: "test-upstream",
      algorithm: "round-robin",
      hashOn: "none",
      hashFallback: "none",
      slots: 10000,
      tags: [] as string[],
    });

    const updated = await repo.update(created.id, {
      algorithm: "least-connections",
      slots: 5000,
      tags: ["updated"],
    });

    expect(updated.algorithm).toBe("least-connections");
    expect(updated.slots).toBe(5000);
    expect(updated.tags).toContain("updated");
  });

  test("deletes an upstream", async () => {
    const created = await repo.create({
      name: "test-upstream",
      algorithm: "round-robin",
      hashOn: "none",
      hashFallback: "none",
      slots: 10000,
      tags: [] as string[],
    });

    const deleted = await repo.delete(created.id);

    expect(deleted).toBe(true);
    expect(await repo.findById(created.id)).toBeNull();
  });
});
