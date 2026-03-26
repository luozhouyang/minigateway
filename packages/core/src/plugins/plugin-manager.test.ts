import { afterEach, beforeEach, describe, expect, test } from "vite-plus/test";
import { join } from "node:path";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { PluginLoader } from "./plugin-loader.js";
import { PluginManager } from "./plugin-manager.js";
import { createPluginTestContext } from "./test-context.js";
import type { PluginDefinition, PluginInstance } from "./types.js";
import { DatabaseService } from "../storage/database.js";
import { runMigrations } from "../storage/migrations.js";
import { PluginBindingRepository } from "../entities/plugin-binding.js";
import { RouteRepository } from "../entities/route.js";
import { ServiceRepository } from "../entities/service.js";

describe("PluginLoader", () => {
  let loader: PluginLoader;

  beforeEach(() => {
    loader = new PluginLoader();
  });

  test("loads new builtin plugins", async () => {
    await expect(loader.loadBuiltin("file-log")).resolves.toMatchObject({ name: "file-log" });
    await expect(loader.loadBuiltin("llm-inbound-openai")).resolves.toMatchObject({
      name: "llm-inbound-openai",
    });
    await expect(loader.loadBuiltin("llm-inbound-anthropic")).resolves.toMatchObject({
      name: "llm-inbound-anthropic",
    });
    await expect(loader.loadBuiltin("llm-router")).resolves.toMatchObject({
      name: "llm-router",
    });
    await expect(loader.loadBuiltin("request-transformer")).resolves.toMatchObject({
      name: "request-transformer",
    });
    await expect(loader.loadBuiltin("response-transformer")).resolves.toMatchObject({
      name: "response-transformer",
    });
  });

  test("lists all builtin plugins", () => {
    expect(loader.listBuiltins()).toEqual(
      expect.arrayContaining([
        "cors",
        "logger",
        "rate-limit",
        "key-auth",
        "file-log",
        "llm-inbound-openai",
        "llm-inbound-anthropic",
        "llm-router",
        "request-transformer",
        "response-transformer",
      ]),
    );
  });
});

describe("PluginManager", () => {
  let tempDir: string;
  let dbPath: string;
  let db: DatabaseService;
  let manager: PluginManager;
  let pluginRepo: PluginBindingRepository;
  let routeRepo: RouteRepository;
  let serviceRepo: ServiceRepository;

  beforeEach(async () => {
    tempDir = mkdtempSync(join(tmpdir(), "plugin-manager-test-"));
    dbPath = join(tempDir, "test.db");
    await runMigrations(dbPath);
    db = new DatabaseService(dbPath);
    manager = new PluginManager(db);
    pluginRepo = new PluginBindingRepository(db);
    routeRepo = new RouteRepository(db);
    serviceRepo = new ServiceRepository(db);
  });

  afterEach(() => {
    db.close();
    rmSync(tempDir, { recursive: true, force: true });
  });

  test("executes plugins in descending priority order", async () => {
    const executionOrder: string[] = [];

    manager.registerPlugin(
      createMockPlugin("low", 10, () => {
        executionOrder.push("low");
      }),
    );
    manager.registerPlugin(
      createMockPlugin("high", 20, () => {
        executionOrder.push("high");
      }),
    );

    const ctx = createPluginTestContext();
    const instances: PluginInstance[] = [
      { id: "low", name: "low", config: {}, enabled: true, priority: 10 },
      { id: "high", name: "high", config: {}, enabled: true, priority: 20 },
    ];

    const result = await manager.executePhase("access", instances, ctx);

    expect(result.stopped).toBe(false);
    expect(executionOrder).toEqual(["high", "low"]);
  });

  test("stops phase execution when a plugin short-circuits", async () => {
    const executionOrder: string[] = [];

    manager.registerPlugin(
      createMockPlugin("short-circuit", 20, () => {
        executionOrder.push("short-circuit");
        return {
          stop: true,
          response: new Response("blocked", { status: 401 }),
        };
      }),
    );
    manager.registerPlugin(
      createMockPlugin("downstream", 10, () => {
        executionOrder.push("downstream");
      }),
    );

    const ctx = createPluginTestContext();
    const instances: PluginInstance[] = [
      { id: "p1", name: "short-circuit", config: {}, enabled: true, priority: 20 },
      { id: "p2", name: "downstream", config: {}, enabled: true, priority: 10 },
    ];

    const result = await manager.executePhase("access", instances, ctx);

    expect(result.stopped).toBe(true);
    expect(result.response?.status).toBe(401);
    expect(executionOrder).toEqual(["short-circuit"]);
  });

  test("resolves the most specific binding for a plugin name", async () => {
    const service = await serviceRepo.create({
      name: "service-1",
      url: "http://service-1.example.com",
      protocol: "http",
      host: "service-1.example.com",
      port: 80,
      connectTimeout: 60_000,
      writeTimeout: 60_000,
      readTimeout: 60_000,
      retries: 5,
      tags: [],
    });
    const route = await routeRepo.create({
      name: "route-1",
      serviceId: service.id,
      paths: ["/route-1"],
      protocols: ["http"],
      stripPath: false,
      preserveHost: false,
      regexPriority: 0,
      pathHandling: "v0",
      tags: [],
    });
    await pluginRepo.create({
      name: "cors",
      config: { origins: ["*"] },
      enabled: true,
      tags: [],
    });
    await pluginRepo.create({
      name: "cors",
      serviceId: service.id,
      config: { origins: ["https://service.example"] },
      enabled: true,
      tags: [],
    });
    const routePlugin = await pluginRepo.create({
      name: "cors",
      routeId: route.id,
      serviceId: service.id,
      config: { origins: ["https://route.example"] },
      enabled: true,
      tags: [],
    });

    const resolved = await manager.resolvePluginInstances({
      routeId: route.id,
      serviceId: service.id,
    });

    expect(resolved).toHaveLength(1);
    expect(resolved[0]).toMatchObject({
      id: routePlugin.id,
      name: "cors",
    });
  });

  test("returns independent plugins after precedence resolution", async () => {
    await pluginRepo.create({
      name: "cors",
      config: { origins: ["*"] },
      enabled: true,
      tags: [],
    });
    await pluginRepo.create({
      name: "request-transformer",
      config: {
        add: {
          headers: ["x-added:true"],
        },
      },
      enabled: true,
      tags: [],
    });

    const resolved = await manager.resolvePluginInstances({});

    expect(resolved.map((instance) => instance.name)).toEqual(["cors", "request-transformer"]);
  });

  test("updates ctx.response when a response plugin returns a replacement response", async () => {
    manager.registerPlugin({
      name: "replace-response",
      version: "1.0.0",
      priority: 100,
      phases: ["response"],
      onResponse: () => ({
        response: new Response(JSON.stringify({ ok: true }), {
          status: 299,
          headers: { "content-type": "application/json" },
        }),
      }),
    });

    const ctx = createPluginTestContext({
      phase: "response",
      response: {
        status: 200,
        statusText: "OK",
        headers: new Headers(),
        body: null,
        source: "upstream",
      },
    });

    const result = await manager.executePhase(
      "response",
      [{ id: "replace", name: "replace-response", config: {}, enabled: true, priority: 100 }],
      ctx,
    );

    expect(result.response?.status).toBe(299);
    expect(ctx.response?.status).toBe(299);
  });
});

function createMockPlugin(
  name: string,
  priority: number,
  onAccess: PluginDefinition["onAccess"],
): PluginDefinition {
  return {
    name,
    version: "1.0.0",
    priority,
    phases: ["access"],
    onAccess,
  };
}
