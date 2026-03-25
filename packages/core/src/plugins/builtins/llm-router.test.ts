import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test";
import { join } from "node:path";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { LlmModelRepository } from "../../entities/llm-model.js";
import { LlmProviderRepository } from "../../entities/llm-provider.js";
import { DatabaseService } from "../../storage/database.js";
import { runMigrations } from "../../storage/migrations.js";
import { createPluginStorageContext } from "../storage-context.js";
import { createPluginTestContext } from "../test-context.js";
import type { PluginHandlerResult } from "../types.js";
import { writeBodyText } from "../runtime.js";
import { LlmRouterPlugin } from "./llm-router.js";

describe("LlmRouterPlugin", () => {
  let tempDir: string;
  let dbPath: string;
  let db: DatabaseService;
  let pluginStorage: unknown;
  let fetchMock: ReturnType<typeof vi.fn>;
  let providerRepo: LlmProviderRepository;
  let modelRepo: LlmModelRepository;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "llm-router-plugin-test-"));
    dbPath = join(tempDir, "test.db");
    runMigrations(dbPath);
    db = new DatabaseService(dbPath);
    providerRepo = new LlmProviderRepository(db);
    modelRepo = new LlmModelRepository(db);
    pluginStorage = LlmRouterPlugin.createStorage?.(
      createPluginStorageContext(db.getRawDatabase(), LlmRouterPlugin),
    );
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    db.close();
    rmSync(tempDir, { recursive: true, force: true });
  });

  test("has builtin metadata", () => {
    expect(LlmRouterPlugin.name).toBe("llm-router");
    expect(LlmRouterPlugin.priority).toBe(700);
    expect(LlmRouterPlugin.phases).toEqual(["access"]);
  });

  test("routes @provider/model to an OpenAI responses upstream", async () => {
    let receivedPath = "";
    let receivedAuth = "";
    let receivedModel = "";

    fetchMock.mockImplementation(async (input, init) => {
      const request = toRequest(input, init);
      receivedPath = new URL(request.url).pathname;
      receivedAuth = request.headers.get("authorization") ?? "";
      const body = JSON.parse(await request.text()) as Record<string, unknown>;
      receivedModel = String(body.model ?? "");

      return new Response(
        JSON.stringify({
          id: "resp_1",
          object: "response",
          model: body.model,
          output: [
            {
              type: "message",
              role: "assistant",
              content: [{ type: "output_text", text: "ok" }],
            },
          ],
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      );
    });

    const provider = await providerRepo.create({
      name: "openai",
      displayName: "OpenAI",
      vendor: "openai",
      protocol: "openai-responses",
      baseUrl: "https://api.openai.com/v1",
      auth: {
        type: "bearer",
        token: "top-secret",
      },
    });
    await modelRepo.create({
      providerId: provider.id,
      name: "gpt-4.1",
      upstreamModel: "gpt-4.1-2026-03-01",
    });

    const ctx = createRequestContext(pluginStorage, {
      method: "POST",
      pathname: "/v1/responses",
      body: {
        model: "@openai/gpt-4.1",
        input: "hello",
      },
    });

    const result = expectPluginResult(await LlmRouterPlugin.onAccess?.(ctx));

    expect(result.response?.status).toBe(200);
    expect(receivedPath).toBe("/v1/responses");
    expect(receivedAuth).toBe("Bearer top-secret");
    expect(receivedModel).toBe("gpt-4.1-2026-03-01");
    expect(ctx.shared.get("llm-router.provider")).toBe("openai");
    expect(ctx.shared.get("llm-router.model")).toBe("gpt-4.1");
    expect(ctx.shared.get("llm-router.upstream-model")).toBe("gpt-4.1-2026-03-01");
  });

  test("transforms Anthropic inbound requests to OpenAI-compatible upstreams", async () => {
    let receivedPath = "";
    let receivedBody: Record<string, unknown> | null = null;

    fetchMock.mockImplementation(async (input, init) => {
      const request = toRequest(input, init);
      receivedPath = new URL(request.url).pathname;
      receivedBody = JSON.parse(await request.text()) as Record<string, unknown>;

      return new Response(
        JSON.stringify({
          id: "chatcmpl_1",
          object: "chat.completion",
          model: "deepseek-chat",
          choices: [
            {
              index: 0,
              message: {
                role: "assistant",
                content: "hello back",
              },
              finish_reason: "stop",
            },
          ],
          usage: {
            prompt_tokens: 10,
            completion_tokens: 4,
            total_tokens: 14,
          },
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      );
    });

    const provider = await providerRepo.create({
      name: "deepseek",
      vendor: "deepseek",
      protocol: "openai-compatible",
      baseUrl: "https://api.deepseek.com",
      auth: { type: "none" },
    });
    await modelRepo.create({
      providerId: provider.id,
      name: "deepseek-chat",
      upstreamModel: "deepseek-chat",
    });

    const ctx = createRequestContext(pluginStorage, {
      method: "POST",
      pathname: "/v1/messages",
      body: {
        model: "@deepseek/deepseek-chat",
        max_tokens: 256,
        messages: [{ role: "user", content: "hello" }],
      },
    });

    const result = expectPluginResult(await LlmRouterPlugin.onAccess?.(ctx));

    expect(receivedPath).toBe("/v1/chat/completions");
    expect(receivedBody).toMatchObject({
      model: "deepseek-chat",
      messages: [{ role: "user", content: "hello" }],
    });

    const responseBody = JSON.parse((await result.response?.text()) ?? "{}") as Record<
      string,
      unknown
    >;
    expect(responseBody).toMatchObject({
      type: "message",
      role: "assistant",
      model: "deepseek-chat",
      content: [{ type: "text", text: "hello back" }],
      stop_reason: "end_turn",
    });
  });

  test("transforms OpenAI chat inbound requests to Anthropic upstreams", async () => {
    let receivedPath = "";
    let receivedApiKey = "";
    let receivedVersion = "";
    let receivedBody: Record<string, unknown> | null = null;

    fetchMock.mockImplementation(async (input, init) => {
      const request = toRequest(input, init);
      receivedPath = new URL(request.url).pathname;
      receivedApiKey = request.headers.get("x-api-key") ?? "";
      receivedVersion = request.headers.get("anthropic-version") ?? "";
      receivedBody = JSON.parse(await request.text()) as Record<string, unknown>;

      return new Response(
        JSON.stringify({
          id: "msg_1",
          type: "message",
          model: "claude-sonnet-4-5",
          role: "assistant",
          content: [{ type: "text", text: "hello from claude" }],
          stop_reason: "end_turn",
          usage: {
            input_tokens: 12,
            output_tokens: 5,
          },
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      );
    });

    const provider = await providerRepo.create({
      name: "anthropic",
      vendor: "anthropic",
      protocol: "anthropic-messages",
      baseUrl: "https://api.anthropic.com",
      auth: {
        type: "api-key",
        key: "anthropic-secret",
        headerName: "x-api-key",
      },
      adapterConfig: {
        anthropicVersion: "2023-06-01",
      },
    });
    await modelRepo.create({
      providerId: provider.id,
      name: "claude-sonnet-4-5",
      upstreamModel: "claude-sonnet-4-5",
    });

    const ctx = createRequestContext(pluginStorage, {
      method: "POST",
      pathname: "/v1/chat/completions",
      body: {
        model: "@anthropic/claude-sonnet-4-5",
        messages: [{ role: "user", content: "hello" }],
      },
    });

    const result = expectPluginResult(await LlmRouterPlugin.onAccess?.(ctx));

    expect(receivedPath).toBe("/v1/messages");
    expect(receivedApiKey).toBe("anthropic-secret");
    expect(receivedVersion).toBe("2023-06-01");
    expect(receivedBody).toMatchObject({
      model: "claude-sonnet-4-5",
      messages: [
        {
          role: "user",
          content: [{ type: "text", text: "hello" }],
        },
      ],
    });

    const responseBody = JSON.parse((await result.response?.text()) ?? "{}") as Record<
      string,
      unknown
    >;
    expect(responseBody).toMatchObject({
      object: "chat.completion",
      model: "claude-sonnet-4-5",
    });
    expect((responseBody.choices as Array<Record<string, unknown>>)[0]).toMatchObject({
      message: {
        role: "assistant",
        content: "hello from claude",
      },
      finish_reason: "stop",
    });
  });

  test("returns 400 when the model reference format is invalid", async () => {
    const ctx = createRequestContext(pluginStorage, {
      method: "POST",
      pathname: "/v1/responses",
      body: {
        model: "gpt-4.1",
        input: "hello",
      },
    });

    const result = expectPluginResult(await LlmRouterPlugin.onAccess?.(ctx));

    expect(result.response?.status).toBe(400);
  });

  test("opens the circuit after a retryable failure and blocks the next request", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: "temporary outage" }), {
        status: 503,
        headers: { "content-type": "application/json" },
      }),
    );

    const provider = await providerRepo.create({
      name: "openai",
      vendor: "openai",
      protocol: "openai-responses",
      baseUrl: "https://api.openai.com/v1",
      auth: { type: "none" },
    });
    await modelRepo.create({
      providerId: provider.id,
      name: "gpt-4.1",
      upstreamModel: "gpt-4.1",
    });

    const config = {
      maxRetries: 0,
      retryOnStatus: [503],
      circuitBreaker: {
        failureThreshold: 1,
        successThreshold: 1,
        openTimeoutMs: 60_000,
        minimumRequests: 1,
        errorRateThreshold: 1,
      },
    };

    const firstCtx = createRequestContext(pluginStorage, {
      method: "POST",
      pathname: "/v1/responses",
      body: {
        model: "@openai/gpt-4.1",
        input: "hello",
      },
      config,
    });
    const firstResult = expectPluginResult(await LlmRouterPlugin.onAccess?.(firstCtx));
    expect(firstResult.response?.status).toBe(503);

    const secondCtx = createRequestContext(pluginStorage, {
      method: "POST",
      pathname: "/v1/responses",
      body: {
        model: "@openai/gpt-4.1",
        input: "hello",
      },
      config,
    });
    const secondResult = expectPluginResult(await LlmRouterPlugin.onAccess?.(secondCtx));
    expect(secondResult.response?.status).toBe(503);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

function createRequestContext(
  pluginStorage: unknown,
  options: {
    method: string;
    pathname: string;
    body: Record<string, unknown>;
    config?: Record<string, unknown>;
  },
) {
  const bodyText = JSON.stringify(options.body);
  const clientRequest = {
    method: options.method,
    url: new URL(`http://gateway.test${options.pathname}`),
    headers: new Headers({
      "content-type": "application/json",
    }),
    body: writeBodyText(bodyText),
  };

  return createPluginTestContext({
    pluginStorage,
    plugin: {
      id: "plugin-1",
      name: "llm-router",
      config: {},
      enabled: true,
      priority: 700,
    },
    clientRequest,
    request: createPluginTestContext({
      clientRequest: {
        ...clientRequest,
        url: new URL(`http://placeholder.invalid${options.pathname}`),
      },
    }).request,
    config: options.config ?? {},
  });
}

function expectPluginResult(result: PluginHandlerResult | void): PluginHandlerResult {
  expect(result).toBeDefined();
  return result as PluginHandlerResult;
}

function toRequest(input: RequestInfo | URL, init?: RequestInit): Request {
  if (input instanceof Request) {
    return input;
  }

  return new Request(input, init);
}
