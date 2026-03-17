import { test, expect, describe, beforeEach, afterEach } from "vite-plus/test";
import { ProxyEngine } from "./proxy-engine.js";
import { DatabaseService } from "../storage/database.js";
import { runMigrations } from "../storage/migrations.js";
import { join } from "node:path";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { ServiceRepository } from "../entities/service.js";
import { RouteRepository } from "../entities/route.js";
import { UpstreamRepository } from "../entities/upstream.js";
import { TargetRepository } from "../entities/target.js";

describe("ProxyEngine", () => {
  let tempDir: string;
  let dbPath: string;
  let db: DatabaseService;
  let engine: ProxyEngine;
  let serviceRepo: ServiceRepository;
  let routeRepo: RouteRepository;
  let upstreamRepo: UpstreamRepository;
  let targetRepo: TargetRepository;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "proxy-engine-test-"));
    dbPath = join(tempDir, "test.db");
    db = new DatabaseService(dbPath);
    runMigrations(dbPath);
    engine = new ProxyEngine(db);
    serviceRepo = new ServiceRepository(db);
    routeRepo = new RouteRepository(db);
    upstreamRepo = new UpstreamRepository(db);
    targetRepo = new TargetRepository(db);
  });

  afterEach(() => {
    db.close();
    rmSync(tempDir, { recursive: true, force: true });
  });

  test("creates proxy engine instance", () => {
    expect(engine).toBeDefined();
  });

  test("matches route by exact path", async () => {
    const service = await serviceRepo.create({
      name: "test-service",
      url: "http://localhost:8080",
    });
    const route = await routeRepo.create({
      name: "test-route",
      serviceId: service.id,
      paths: ["/api/test"],
    });

    const request = new Request("http://gateway:8000/api/test");
    const matchedRoute = await engine.matchRoute(request);

    expect(matchedRoute).toBeDefined();
    expect(matchedRoute?.id).toBe(route.id);
  });

  test("matches route by path prefix", async () => {
    const service = await serviceRepo.create({
      name: "test-service",
      url: "http://localhost:8080",
    });
    const route = await routeRepo.create({
      name: "test-route",
      serviceId: service.id,
      paths: ["/api/"],
    });

    const request = new Request("http://gateway:8000/api/users/123");
    const matchedRoute = await engine.matchRoute(request);

    expect(matchedRoute).toBeDefined();
    expect(matchedRoute?.id).toBe(route.id);
  });

  test("matches route by method", async () => {
    const service = await serviceRepo.create({
      name: "test-service",
      url: "http://localhost:8080",
    });
    const route = await routeRepo.create({
      name: "test-route",
      serviceId: service.id,
      paths: ["/api"],
      methods: ["POST"],
    });

    const request = new Request("http://gateway:8000/api", { method: "POST" });
    const matchedRoute = await engine.matchRoute(request);

    expect(matchedRoute).toBeDefined();
    expect(matchedRoute?.id).toBe(route.id);
  });

  test("does not match route when method does not match", async () => {
    const service = await serviceRepo.create({
      name: "test-service",
      url: "http://localhost:8080",
    });
    await routeRepo.create({
      name: "test-route",
      serviceId: service.id,
      paths: ["/api"],
      methods: ["POST"],
    });

    const request = new Request("http://gateway:8000/api", { method: "GET" });
    const matchedRoute = await engine.matchRoute(request);

    expect(matchedRoute).toBeNull();
  });

  test("matches route by host", async () => {
    const service = await serviceRepo.create({
      name: "test-service",
      url: "http://localhost:8080",
    });
    const route = await routeRepo.create({
      name: "test-route",
      serviceId: service.id,
      paths: ["/"],
      hosts: ["api.example.com"],
    });

    const request = new Request("http://api.example.com/test");
    const matchedRoute = await engine.matchRoute(request);

    expect(matchedRoute).toBeDefined();
    expect(matchedRoute?.id).toBe(route.id);
  });

  test("does not match route when host does not match", async () => {
    const service = await serviceRepo.create({
      name: "test-service",
      url: "http://localhost:8080",
    });
    await routeRepo.create({
      name: "test-route",
      serviceId: service.id,
      paths: ["/"],
      hosts: ["api.example.com"],
    });

    const request = new Request("http://other.com/test");
    const matchedRoute = await engine.matchRoute(request);

    expect(matchedRoute).toBeNull();
  });

  test("selects target with round-robin algorithm", async () => {
    const upstream = await upstreamRepo.create({ name: "test-upstream", algorithm: "round-robin" });
    await targetRepo.create({ upstreamId: upstream.id, target: "localhost:8081", weight: 100 });
    await targetRepo.create({ upstreamId: upstream.id, target: "localhost:8082", weight: 100 });
    await targetRepo.create({ upstreamId: upstream.id, target: "localhost:8083", weight: 100 });

    const targets = await targetRepo.findByUpstreamId(upstream.id);

    // First selection
    const target1 = engine.selectTargetWithAlgorithm(targets, "round-robin");
    // Second selection
    const target2 = engine.selectTargetWithAlgorithm(targets, "round-robin");
    // Third selection
    const target3 = engine.selectTargetWithAlgorithm(targets, "round-robin");

    expect(target1).toBeDefined();
    expect(target2).toBeDefined();
    expect(target3).toBeDefined();
    expect(target1?.id).not.toBe(target2?.id);
    expect(target2?.id).not.toBe(target3?.id);
  });

  test("selects target with least-connections algorithm", async () => {
    const upstream = await upstreamRepo.create({
      name: "test-upstream",
      algorithm: "least-connections",
    });
    const target1 = await targetRepo.create({
      upstreamId: upstream.id,
      target: "localhost:8081",
      weight: 100,
    });
    const target2 = await targetRepo.create({
      upstreamId: upstream.id,
      target: "localhost:8082",
      weight: 100,
    });

    const targets = await targetRepo.findByUpstreamId(upstream.id);

    // First, select a target to initialize the load balancer
    engine.selectTargetWithAlgorithm(targets, "least-connections");

    // Simulate active connections
    engine.recordConnection(target1.id);
    engine.recordConnection(target1.id);
    engine.recordConnection(target2.id);

    // Should select target2 (fewer connections)
    const selected = engine.selectTargetWithAlgorithm(targets, "least-connections");
    expect(selected?.id).toBe(target2.id);
  });

  test("selects target with hash algorithm", async () => {
    const upstream = await upstreamRepo.create({ name: "test-upstream", algorithm: "hash" });
    await targetRepo.create({ upstreamId: upstream.id, target: "localhost:8081", weight: 100 });
    await targetRepo.create({ upstreamId: upstream.id, target: "localhost:8082", weight: 100 });

    const targets = await targetRepo.findByUpstreamId(upstream.id);

    // Same key should always select same target
    const request1 = new Request("http://gateway/test", { headers: { "x-user-id": "user-123" } });
    const request2 = new Request("http://gateway/test", { headers: { "x-user-id": "user-123" } });

    const target1 = engine.selectTargetWithAlgorithm(targets, "hash", request1);
    const target2 = engine.selectTargetWithAlgorithm(targets, "hash", request2);

    expect(target1?.id).toBe(target2?.id);
  });

  test("marks target as unhealthy", async () => {
    const upstream = await upstreamRepo.create({ name: "test-upstream" });
    const target = await targetRepo.create({ upstreamId: upstream.id, target: "localhost:8081" });

    engine.markUnhealthy(target.id);
    const isHealthy = engine.isHealthy(target.id);

    expect(isHealthy).toBe(false);
  });

  test("marks target as healthy", async () => {
    const upstream = await upstreamRepo.create({ name: "test-upstream" });
    const target = await targetRepo.create({ upstreamId: upstream.id, target: "localhost:8081" });

    engine.markUnhealthy(target.id);
    engine.markHealthy(target.id);
    const isHealthy = engine.isHealthy(target.id);

    expect(isHealthy).toBe(true);
  });

  test("excludes unhealthy targets from selection", async () => {
    const upstream = await upstreamRepo.create({ name: "test-upstream", algorithm: "round-robin" });
    const target1 = await targetRepo.create({ upstreamId: upstream.id, target: "localhost:8081" });
    const target2 = await targetRepo.create({ upstreamId: upstream.id, target: "localhost:8082" });

    engine.markUnhealthy(target1.id);

    const targets = await targetRepo.findByUpstreamId(upstream.id);
    const selected = engine.selectTargetWithAlgorithm(targets, "round-robin");

    expect(selected?.id).toBe(target2.id);
  });

  test("returns null when all targets are unhealthy", async () => {
    const upstream = await upstreamRepo.create({ name: "test-upstream" });
    await targetRepo.create({ upstreamId: upstream.id, target: "localhost:8081" });
    await targetRepo.create({ upstreamId: upstream.id, target: "localhost:8082" });

    const targets = await targetRepo.findByUpstreamId(upstream.id);
    targets.forEach((t) => engine.markUnhealthy(t.id));

    const selected = engine.selectTargetWithAlgorithm(targets, "round-robin");
    expect(selected).toBeNull();
  });

  test("releases connection", async () => {
    const upstream = await upstreamRepo.create({
      name: "test-upstream",
      algorithm: "least-connections",
    });
    const target = await targetRepo.create({ upstreamId: upstream.id, target: "localhost:8081" });

    const targets = await targetRepo.findByUpstreamId(upstream.id);

    // First, select a target to initialize the load balancer
    engine.selectTargetWithAlgorithm(targets, "least-connections");

    engine.recordConnection(target.id);
    engine.recordConnection(target.id);
    engine.releaseConnection(target.id);

    // Should have 1 active connection now
    const selected = engine.selectTargetWithAlgorithm(targets, "least-connections");
    expect(selected).toBeDefined();
  });
});
