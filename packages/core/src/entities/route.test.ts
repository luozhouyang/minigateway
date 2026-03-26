import { test, expect, beforeEach, afterEach, describe } from "vite-plus/test";
import { DatabaseService } from "../storage/database.js";
import { RouteRepository } from "./route.js";
import { ServiceRepository } from "./service.js";
import { runMigrations } from "../storage/migrations.js";
import { join } from "node:path";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";

describe("RouteRepository", () => {
  let tempDir: string;
  let dbPath: string;
  let db: DatabaseService;
  let routeRepo: RouteRepository;
  let serviceRepo: ServiceRepository;

  beforeEach(async () => {
    tempDir = mkdtempSync(join(tmpdir(), "route-repo-test-"));
    dbPath = join(tempDir, "test.db");
    await runMigrations(dbPath);
    db = new DatabaseService(dbPath);
    routeRepo = new RouteRepository(db);
    serviceRepo = new ServiceRepository(db);
  });

  afterEach(() => {
    db.close();
    rmSync(tempDir, { recursive: true, force: true });
  });

  test("creates a route", async () => {
    const service = await serviceRepo.create({
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

    const route = await routeRepo.create({
      name: "test-route",
      serviceId: service.id,
      protocols: ["http", "https"],
      methods: ["GET", "POST"],
      paths: ["/api"],
      stripPath: false,
      preserveHost: false,
      regexPriority: 0,
      pathHandling: "v0",
      tags: ["test"],
    });

    expect(route.name).toBe("test-route");
    expect(route.serviceId).toBe(service.id);
    expect(route.protocols).toContain("http");
    expect(route.methods).toContain("GET");
    expect(route.paths).toContain("/api");
    expect(route.id).toBeDefined();
  });

  test("finds route by id", async () => {
    const service = await serviceRepo.create({
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

    const created = await routeRepo.create({
      name: "test-route",
      serviceId: service.id,
      protocols: ["http"],
      stripPath: false,
      preserveHost: false,
      regexPriority: 0,
      pathHandling: "v0",
      tags: [] as string[],
    });

    const found = await routeRepo.findById(created.id);

    expect(found).toBeDefined();
    expect(found?.id).toBe(created.id);
    expect(found?.name).toBe("test-route");
  });

  test("finds route by name", async () => {
    const service = await serviceRepo.create({
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

    await routeRepo.create({
      name: "unique-route",
      serviceId: service.id,
      protocols: ["http"],
      stripPath: false,
      preserveHost: false,
      regexPriority: 0,
      pathHandling: "v0",
      tags: [] as string[],
    });

    const found = await routeRepo.findByName("unique-route");

    expect(found).toBeDefined();
    expect(found?.name).toBe("unique-route");
  });

  test("returns null for non-existent route", async () => {
    const found = await routeRepo.findByName("non-existent");
    expect(found).toBeNull();
  });

  test("finds all routes", async () => {
    const service = await serviceRepo.create({
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

    await routeRepo.create({
      name: "route-1",
      serviceId: service.id,
      protocols: ["http"],
      stripPath: false,
      preserveHost: false,
      regexPriority: 0,
      pathHandling: "v0",
      tags: [] as string[],
    });
    await routeRepo.create({
      name: "route-2",
      serviceId: service.id,
      protocols: ["https"],
      stripPath: true,
      preserveHost: false,
      regexPriority: 0,
      pathHandling: "v0",
      tags: [] as string[],
    });

    const routes = await routeRepo.findAll();

    expect(routes).toHaveLength(2);
  });

  test("updates a route", async () => {
    const service = await serviceRepo.create({
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

    const created = await routeRepo.create({
      name: "test-route",
      serviceId: service.id,
      protocols: ["http"],
      stripPath: false,
      preserveHost: false,
      regexPriority: 0,
      pathHandling: "v0",
      tags: [] as string[],
    });

    const updated = await routeRepo.update(created.id, {
      stripPath: true,
      tags: ["updated"],
    });

    expect(updated.stripPath).toBe(true);
    expect(updated.tags).toContain("updated");
  });

  test("deletes a route", async () => {
    const service = await serviceRepo.create({
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

    const created = await routeRepo.create({
      name: "test-route",
      serviceId: service.id,
      protocols: ["http"],
      stripPath: false,
      preserveHost: false,
      regexPriority: 0,
      pathHandling: "v0",
      tags: [] as string[],
    });

    const deleted = await routeRepo.delete(created.id);

    expect(deleted).toBe(true);
    expect(await routeRepo.findById(created.id)).toBeNull();
  });

  test("finds routes by service id", async () => {
    const service1 = await serviceRepo.create({
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

    const service2 = await serviceRepo.create({
      name: "service-2",
      url: "http://localhost:8081",
      protocol: "http",
      host: "localhost",
      port: 8081,
      connectTimeout: 60000,
      writeTimeout: 60000,
      readTimeout: 60000,
      retries: 5,
      tags: [] as string[],
    });

    await routeRepo.create({
      name: "route-1",
      serviceId: service1.id,
      protocols: ["http"],
      stripPath: false,
      preserveHost: false,
      regexPriority: 0,
      pathHandling: "v0",
      tags: [] as string[],
    });
    await routeRepo.create({
      name: "route-2",
      serviceId: service1.id,
      protocols: ["http"],
      stripPath: false,
      preserveHost: false,
      regexPriority: 0,
      pathHandling: "v0",
      tags: [] as string[],
    });
    await routeRepo.create({
      name: "route-3",
      serviceId: service2.id,
      protocols: ["http"],
      stripPath: false,
      preserveHost: false,
      regexPriority: 0,
      pathHandling: "v0",
      tags: [] as string[],
    });

    const routes = await routeRepo.findByServiceId(service1.id);

    expect(routes).toHaveLength(2);
    expect(routes.every((r) => r.serviceId === service1.id)).toBe(true);
  });
});
