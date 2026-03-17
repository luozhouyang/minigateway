import { test, expect, beforeEach, afterEach, describe } from "vite-plus/test";
import { DatabaseService } from "../storage/database.js";
import { ServiceRepository } from "./service.js";
import { runMigrations } from "../storage/migrations.js";
import { join } from "node:path";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";

describe("ServiceRepository", () => {
  let tempDir: string;
  let dbPath: string;
  let db: DatabaseService;
  let repo: ServiceRepository;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "service-repo-test-"));
    dbPath = join(tempDir, "test.db");
    db = new DatabaseService(dbPath);
    repo = new ServiceRepository(db);

    // Run database migrations
    runMigrations(db);
  });

  afterEach(() => {
    db.close();
    rmSync(tempDir, { recursive: true, force: true });
  });

  test("creates a service", async () => {
    const service = await repo.create({
      name: "test-service",
      url: "http://localhost:8080/api",
      protocol: "http",
      host: "localhost",
      port: 8080,
      path: "/api",
      connectTimeout: 60000,
      writeTimeout: 60000,
      readTimeout: 60000,
      retries: 5,
      tags: ["test"],
    });

    expect(service.name).toBe("test-service");
    expect(service.protocol).toBe("http");
    expect(service.host).toBe("localhost");
    expect(service.port).toBe(8080);
    expect(service.id).toBeDefined();
  });

  test("finds service by id", async () => {
    const created = await repo.create({
      name: "test-service",
      url: "http://localhost:8080",
      protocol: "http",
      host: "localhost",
      port: 8080,
      connectTimeout: 60000,
      writeTimeout: 60000,
      readTimeout: 60000,
      retries: 5,
      tags: [] as string[],
    });

    const found = await repo.findById(created.id);

    expect(found).toBeDefined();
    expect(found?.id).toBe(created.id);
    expect(found?.name).toBe("test-service");
  });

  test("finds service by name", async () => {
    await repo.create({
      name: "unique-service",
      url: "http://localhost:8080",
      protocol: "http",
      host: "localhost",
      port: 8080,
      connectTimeout: 60000,
      writeTimeout: 60000,
      readTimeout: 60000,
      retries: 5,
      tags: [] as string[],
    });

    const found = await repo.findByName("unique-service");

    expect(found).toBeDefined();
    expect(found?.name).toBe("unique-service");
  });

  test("returns null for non-existent service", async () => {
    const found = await repo.findByName("non-existent");
    expect(found).toBeNull();
  });

  test("finds all services", async () => {
    await repo.create({
      name: "service-1",
      url: "http://localhost:8080",
      protocol: "http",
      host: "localhost",
      port: 8080,
      connectTimeout: 60000,
      writeTimeout: 60000,
      readTimeout: 60000,
      retries: 5,
      tags: [] as string[],
    });
    await repo.create({
      name: "service-2",
      url: "https://api.example.com:443",
      protocol: "https",
      host: "api.example.com",
      port: 443,
      connectTimeout: 60000,
      writeTimeout: 60000,
      readTimeout: 60000,
      retries: 5,
      tags: [] as string[],
    });

    const services = await repo.findAll();

    expect(services).toHaveLength(2);
  });

  test("updates a service", async () => {
    const created = await repo.create({
      name: "test-service",
      url: "http://localhost:8080",
      protocol: "http",
      host: "localhost",
      port: 8080,
      connectTimeout: 60000,
      writeTimeout: 60000,
      readTimeout: 60000,
      retries: 5,
      tags: [] as string[],
    });

    const updated = await repo.update(created.id, {
      port: 9090,
      tags: ["updated"],
    });

    expect(updated.port).toBe(9090);
    expect(updated.tags).toContain("updated");
  });

  test("deletes a service", async () => {
    const created = await repo.create({
      name: "test-service",
      url: "http://localhost:8080",
      protocol: "http",
      host: "localhost",
      port: 8080,
      connectTimeout: 60000,
      writeTimeout: 60000,
      readTimeout: 60000,
      retries: 5,
      tags: [] as string[],
    });

    const deleted = await repo.delete(created.id);

    expect(deleted).toBe(true);
    expect(await repo.findById(created.id)).toBeNull();
  });
});
