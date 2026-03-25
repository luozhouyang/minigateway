import { afterEach, beforeEach, describe, expect, test } from "vite-plus/test";
import { createTestContext, destroyTestContext, type TestContext } from "../test-utils.js";

describe("LLM Models Routes", () => {
  let ctx: TestContext;

  beforeEach(() => {
    ctx = createTestContext();
  });

  afterEach(() => {
    destroyTestContext(ctx);
  });

  async function createProvider() {
    const response = await ctx.app.request("/admin/llm-providers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "openai",
        vendor: "openai",
        protocol: "openai-responses",
        baseUrl: "https://api.openai.com/v1",
      }),
    });

    return response.json();
  }

  test("creates an LLM model", async () => {
    const provider = await createProvider();

    const response = await ctx.app.request("/admin/llm-models", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        providerId: provider.data.id,
        name: "gpt-4.1",
        upstreamModel: "gpt-4.1",
        metadata: {
          family: "gpt",
        },
        tags: ["default"],
      }),
    });

    expect(response.status).toBe(201);
    const json = await response.json();
    expect(json.data).toMatchObject({
      providerId: provider.data.id,
      name: "gpt-4.1",
      upstreamModel: "gpt-4.1",
      metadata: {
        family: "gpt",
      },
    });
  });

  test("lists and filters models by provider name and enabled state", async () => {
    const provider = await createProvider();

    await ctx.app.request("/admin/llm-models", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        providerId: provider.data.id,
        name: "gpt-4.1",
        upstreamModel: "gpt-4.1",
        enabled: true,
      }),
    });
    await ctx.app.request("/admin/llm-models", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        providerId: provider.data.id,
        name: "gpt-4.1-mini",
        upstreamModel: "gpt-4.1-mini",
        enabled: false,
      }),
    });

    const response = await ctx.app.request(
      "/admin/llm-models?providerName=openai&enabled=false&limit=20&offset=0",
    );

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.data).toHaveLength(1);
    expect(json.data[0]).toMatchObject({
      name: "gpt-4.1-mini",
      enabled: false,
    });
  });

  test("rejects duplicate model names within the same provider", async () => {
    const provider = await createProvider();

    await ctx.app.request("/admin/llm-models", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        providerId: provider.data.id,
        name: "gpt-4.1",
        upstreamModel: "gpt-4.1",
      }),
    });

    const duplicateResponse = await ctx.app.request("/admin/llm-models", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        providerId: provider.data.id,
        name: "gpt-4.1",
        upstreamModel: "gpt-4.1-preview",
      }),
    });

    expect(duplicateResponse.status).toBe(409);
  });

  test("updates and deletes an LLM model", async () => {
    const provider = await createProvider();

    const createResponse = await ctx.app.request("/admin/llm-models", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        providerId: provider.data.id,
        name: "gpt-4.1",
        upstreamModel: "gpt-4.1",
      }),
    });
    const created = await createResponse.json();

    const updateResponse = await ctx.app.request(`/admin/llm-models/${created.data.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        upstreamModel: "gpt-4.1-2026-03-01",
        metadata: {
          tier: "stable",
        },
      }),
    });

    expect(updateResponse.status).toBe(200);
    const updated = await updateResponse.json();
    expect(updated.data).toMatchObject({
      upstreamModel: "gpt-4.1-2026-03-01",
      metadata: {
        tier: "stable",
      },
    });

    const deleteResponse = await ctx.app.request(`/admin/llm-models/${created.data.id}`, {
      method: "DELETE",
    });

    expect(deleteResponse.status).toBe(200);
    const deleted = await deleteResponse.json();
    expect(deleted.data.deleted).toBe(true);
  });
});
