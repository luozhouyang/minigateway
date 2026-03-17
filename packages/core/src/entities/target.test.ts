import { test, expect, beforeEach, afterEach, describe } from "vite-plus/test";
import { DatabaseService } from "../storage/database.js";
import { TargetRepository } from "./target.js";
import { UpstreamRepository } from "./upstream.js";
import { runMigrations } from "../storage/migrations.js";
import { join } from "node:path";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";

describe("TargetRepository", () => {
  let tempDir: string;
  let dbPath: string;
  let db: DatabaseService;
  let targetRepo: TargetRepository;
  let upstreamRepo: UpstreamRepository;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "target-repo-test-"));
    dbPath = join(tempDir, "test.db");
    db = new DatabaseService(dbPath);
    targetRepo = new TargetRepository(db);
    upstreamRepo = new UpstreamRepository(db);

    runMigrations(dbPath);
  });

  afterEach(() => {
    db.close();
    rmSync(tempDir, { recursive: true, force: true });
  });

  test("creates a target", async () => {
    const upstream = await upstreamRepo.create({
      name: "test-upstream",
      algorithm: "round-robin",
      hashOn: "none",
      hashFallback: "none",
      slots: 10000,
      tags: [] as string[],
    });

    const target = await targetRepo.create({
      upstreamId: upstream.id,
      target: "localhost:8080",
      weight: 100,
      tags: ["test"],
    });

    expect(target.target).toBe("localhost:8080");
    expect(target.weight).toBe(100);
    expect(target.upstreamId).toBe(upstream.id);
    expect(target.id).toBeDefined();
  });

  test("finds target by id", async () => {
    const upstream = await upstreamRepo.create({
      name: "test-upstream",
      algorithm: "round-robin",
      hashOn: "none",
      hashFallback: "none",
      slots: 10000,
      tags: [] as string[],
    });

    const created = await targetRepo.create({
      upstreamId: upstream.id,
      target: "localhost:8080",
      weight: 100,
      tags: [] as string[],
    });

    const found = await targetRepo.findById(created.id);

    expect(found).toBeDefined();
    expect(found?.id).toBe(created.id);
    expect(found?.target).toBe("localhost:8080");
  });

  test("finds targets by upstream id", async () => {
    const upstream1 = await upstreamRepo.create({
      name: "upstream-1",
      algorithm: "round-robin",
      hashOn: "none",
      hashFallback: "none",
      slots: 10000,
      tags: [] as string[],
    });

    const upstream2 = await upstreamRepo.create({
      name: "upstream-2",
      algorithm: "round-robin",
      hashOn: "none",
      hashFallback: "none",
      slots: 10000,
      tags: [] as string[],
    });

    await targetRepo.create({
      upstreamId: upstream1.id,
      target: "target-1:8080",
      weight: 100,
      tags: [] as string[],
    });
    await targetRepo.create({
      upstreamId: upstream1.id,
      target: "target-2:8080",
      weight: 50,
      tags: [] as string[],
    });
    await targetRepo.create({
      upstreamId: upstream2.id,
      target: "target-3:8080",
      weight: 100,
      tags: [] as string[],
    });

    const targets = await targetRepo.findByUpstreamId(upstream1.id);

    expect(targets).toHaveLength(2);
    expect(targets.every((t) => t.upstreamId === upstream1.id)).toBe(true);
  });

  test("finds all targets", async () => {
    const upstream = await upstreamRepo.create({
      name: "test-upstream",
      algorithm: "round-robin",
      hashOn: "none",
      hashFallback: "none",
      slots: 10000,
      tags: [] as string[],
    });

    await targetRepo.create({
      upstreamId: upstream.id,
      target: "target-1:8080",
      weight: 100,
      tags: [] as string[],
    });
    await targetRepo.create({
      upstreamId: upstream.id,
      target: "target-2:8080",
      weight: 50,
      tags: [] as string[],
    });

    const targets = await targetRepo.findAll();

    expect(targets).toHaveLength(2);
  });

  test("updates a target", async () => {
    const upstream = await upstreamRepo.create({
      name: "test-upstream",
      algorithm: "round-robin",
      hashOn: "none",
      hashFallback: "none",
      slots: 10000,
      tags: [] as string[],
    });

    const created = await targetRepo.create({
      upstreamId: upstream.id,
      target: "localhost:8080",
      weight: 100,
      tags: [] as string[],
    });

    const updated = await targetRepo.update(created.id, {
      weight: 75,
      tags: ["updated"],
    });

    expect(updated.weight).toBe(75);
    expect(updated.tags).toContain("updated");
  });

  test("deletes a target", async () => {
    const upstream = await upstreamRepo.create({
      name: "test-upstream",
      algorithm: "round-robin",
      hashOn: "none",
      hashFallback: "none",
      slots: 10000,
      tags: [] as string[],
    });

    const created = await targetRepo.create({
      upstreamId: upstream.id,
      target: "localhost:8080",
      weight: 100,
      tags: [] as string[],
    });

    const deleted = await targetRepo.delete(created.id);

    expect(deleted).toBe(true);
    expect(await targetRepo.findById(created.id)).toBeNull();
  });
});
