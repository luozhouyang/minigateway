// Consumers Routes Tests

import { test, expect, beforeEach, afterEach, describe } from "vite-plus/test";
import { createTestContext, destroyTestContext } from "../test-utils.js";
import type { TestContext } from "../test-utils.js";

describe("Consumers Routes", () => {
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = await createTestContext();
  });

  afterEach(() => {
    destroyTestContext(ctx);
  });

  describe("POST /admin/consumers", () => {
    test("creates a consumer with username", async () => {
      const body = {
        username: "test-user",
        tags: ["test"],
      };

      const response = await ctx.app.request("/admin/consumers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      expect(response.status).toBe(201);
      const json = await response.json();
      expect(json.data).toBeDefined();
      expect(json.data.username).toBe("test-user");
    });

    test("creates a consumer with customId", async () => {
      const body = {
        customId: "custom-123",
        tags: ["test"],
      };

      const response = await ctx.app.request("/admin/consumers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      expect(response.status).toBe(201);
      const json = await response.json();
      expect(json.data).toBeDefined();
      expect(json.data.customId).toBe("custom-123");
    });

    test("returns 400 for missing required fields", async () => {
      const body = { tags: ["test"] };

      const response = await ctx.app.request("/admin/consumers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.error).toBeDefined();
      expect(json.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("GET /admin/consumers", () => {
    test("lists all consumers", async () => {
      await ctx.app.request("/admin/consumers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: "user-1",
        }),
      });

      await ctx.app.request("/admin/consumers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: "user-2",
        }),
      });

      const response = await ctx.app.request("/admin/consumers");

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.data).toHaveLength(2);
    });

    test("supports pagination", async () => {
      const response = await ctx.app.request("/admin/consumers?limit=5&offset=0");

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.data).toBeDefined();
      expect(json.meta).toBeDefined();
    });

    test("filters by username", async () => {
      await ctx.app.request("/admin/consumers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: "unique-user",
        }),
      });

      const response = await ctx.app.request("/admin/consumers?username=unique");

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.data).toHaveLength(1);
      expect(json.data[0].username).toBe("unique-user");
    });
  });

  describe("GET /admin/consumers/:id", () => {
    test("gets a consumer by id", async () => {
      const createResponse = await ctx.app.request("/admin/consumers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: "test-user",
        }),
      });
      const created = await createResponse.json();

      const response = await ctx.app.request(`/admin/consumers/${created.data.id}`);

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.data.id).toBe(created.data.id);
      expect(json.data.username).toBe("test-user");
    });

    test("returns 404 for non-existent consumer", async () => {
      const response = await ctx.app.request("/admin/consumers/non-existent-id");

      expect(response.status).toBe(404);
      const json = await response.json();
      expect(json.error).toBeDefined();
      expect(json.error.code).toBe("NOT_FOUND");
    });
  });

  describe("PUT /admin/consumers/:id", () => {
    test("updates a consumer", async () => {
      const createResponse = await ctx.app.request("/admin/consumers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: "test-user",
        }),
      });
      const created = await createResponse.json();

      const response = await ctx.app.request(`/admin/consumers/${created.data.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: "updated-user",
          tags: ["updated"],
        }),
      });

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.data.username).toBe("updated-user");
      expect(json.data.tags).toContain("updated");
    });

    test("returns 404 for non-existent consumer", async () => {
      const response = await ctx.app.request("/admin/consumers/non-existent-id", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "updated-name" }),
      });

      expect(response.status).toBe(404);
      const json = await response.json();
      expect(json.error).toBeDefined();
    });
  });

  describe("DELETE /admin/consumers/:id", () => {
    test("deletes a consumer", async () => {
      const createResponse = await ctx.app.request("/admin/consumers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: "test-user",
        }),
      });
      const created = await createResponse.json();

      const deleteResponse = await ctx.app.request(`/admin/consumers/${created.data.id}`, {
        method: "DELETE",
      });

      expect(deleteResponse.status).toBe(200);
      const deleteJson = await deleteResponse.json();
      expect(deleteJson.data.deleted).toBe(true);

      // Verify consumer is deleted
      const getResponse = await ctx.app.request(`/admin/consumers/${created.data.id}`);
      expect(getResponse.status).toBe(404);
    });

    test("returns 404 for non-existent consumer", async () => {
      const response = await ctx.app.request("/admin/consumers/non-existent-id", {
        method: "DELETE",
      });

      expect(response.status).toBe(404);
      const json = await response.json();
      expect(json.error).toBeDefined();
    });
  });
});
