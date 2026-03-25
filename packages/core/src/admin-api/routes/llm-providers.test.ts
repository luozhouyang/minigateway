import { afterEach, beforeEach, describe, expect, test } from "vite-plus/test";
import { createTestContext, destroyTestContext, type TestContext } from "../test-utils.js";

describe("LLM Providers Routes", () => {
  let ctx: TestContext;

  beforeEach(() => {
    ctx = createTestContext();
  });

  afterEach(() => {
    destroyTestContext(ctx);
  });

  test("creates an LLM provider with vendor metadata", async () => {
    const response = await ctx.app.request("/admin/llm-providers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "openai",
        displayName: "OpenAI",
        vendor: "openai",
        protocol: "openai-responses",
        baseUrl: "https://api.openai.com/v1",
        clients: ["codex"],
        auth: {
          type: "bearer",
          tokenEnv: "OPENAI_API_KEY",
        },
        adapterConfig: {
          region: "global",
        },
        tags: ["prod"],
      }),
    });

    expect(response.status).toBe(201);
    const json = await response.json();
    expect(json.data).toMatchObject({
      name: "openai",
      displayName: "OpenAI",
      vendor: "openai",
      protocol: "openai-responses",
      adapterConfig: {
        region: "global",
      },
    });
  });

  test("lists and filters providers by vendor and enabled state", async () => {
    await ctx.app.request("/admin/llm-providers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "openai",
        vendor: "openai",
        protocol: "openai-responses",
        baseUrl: "https://api.openai.com/v1",
      }),
    });
    await ctx.app.request("/admin/llm-providers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "anthropic",
        vendor: "anthropic",
        enabled: false,
        protocol: "anthropic-messages",
        baseUrl: "https://api.anthropic.com",
      }),
    });

    const response = await ctx.app.request("/admin/llm-providers?vendor=anthropic&enabled=false");

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.data).toHaveLength(1);
    expect(json.data[0]).toMatchObject({
      name: "anthropic",
      vendor: "anthropic",
      enabled: false,
    });
  });

  test("creates and lists provider-scoped models", async () => {
    const createProviderResponse = await ctx.app.request("/admin/llm-providers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "deepseek",
        vendor: "deepseek",
        protocol: "openai-compatible",
        baseUrl: "https://api.deepseek.com",
      }),
    });
    const provider = await createProviderResponse.json();

    const createModelResponse = await ctx.app.request(
      `/admin/llm-providers/${provider.data.id}/models`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "deepseek-chat",
          upstreamModel: "deepseek-chat",
          metadata: {
            tier: "default",
          },
        }),
      },
    );

    expect(createModelResponse.status).toBe(201);

    const listModelsResponse = await ctx.app.request(
      `/admin/llm-providers/${provider.data.id}/models?limit=20&offset=0`,
    );
    expect(listModelsResponse.status).toBe(200);
    const listJson = await listModelsResponse.json();
    expect(listJson.data).toHaveLength(1);
    expect(listJson.data[0]).toMatchObject({
      providerId: provider.data.id,
      name: "deepseek-chat",
      upstreamModel: "deepseek-chat",
    });
  });

  test("updates and deletes an LLM provider", async () => {
    const createResponse = await ctx.app.request("/admin/llm-providers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "kimi",
        vendor: "kimi",
        protocol: "openai-compatible",
        baseUrl: "https://api.moonshot.cn/v1",
      }),
    });
    const created = await createResponse.json();

    const updateResponse = await ctx.app.request(`/admin/llm-providers/${created.data.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        enabled: false,
        displayName: "Kimi CN",
        headers: {
          "x-provider": "kimi",
        },
      }),
    });

    expect(updateResponse.status).toBe(200);
    const updated = await updateResponse.json();
    expect(updated.data).toMatchObject({
      enabled: false,
      displayName: "Kimi CN",
      headers: {
        "x-provider": "kimi",
      },
    });

    const deleteResponse = await ctx.app.request(`/admin/llm-providers/${created.data.id}`, {
      method: "DELETE",
    });

    expect(deleteResponse.status).toBe(200);
    const deleted = await deleteResponse.json();
    expect(deleted.data.deleted).toBe(true);
  });
});
