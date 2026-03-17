// Upstreams Routes Tests

import { test, expect, beforeEach, afterEach, describe } from "vite-plus/test";
import { createTestContext, destroyTestContext } from "../test-utils.js";
import type { TestContext } from "../test-utils.js";

describe("Upstreams Routes", () => {
  let ctx: TestContext;

  beforeEach(() => {
    ctx = createTestContext();
  });

  afterEach(() => {
    destroyTestContext(ctx);
  });

  describe("POST /admin/upstreams", () => {
    test("creates an upstream", async () => {
      const body = {
        name: "test-upstream",
        algorithm: "round-robin",
        slots: 10000,
        tags: ["test"],
      };

      const response = await ctx.app.request("/admin/upstreams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      expect(response.status).toBe(201);
      const json = await response.json();
      expect(json.data).toBeDefined();
      expect(json.data.name).toBe("test-upstream");
      expect(json.data.algorithm).toBe("round-robin");
      expect(json.data.slots).toBe(10000);
    });

    test("returns 400 for missing required fields", async () => {
      const body = { name: "" };

      const response = await ctx.app.request("/admin/upstreams", {
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

  describe("GET /admin/upstreams", () => {
    test("lists all upstreams", async () => {
      await ctx.app.request("/admin/upstreams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "upstream-1",
          algorithm: "round-robin",
        }),
      });

      await ctx.app.request("/admin/upstreams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "upstream-2",
          algorithm: "least-connections",
        }),
      });

      const response = await ctx.app.request("/admin/upstreams");

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.data).toHaveLength(2);
    });

    test("supports pagination", async () => {
      const response = await ctx.app.request("/admin/upstreams?limit=5&offset=0");

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.data).toBeDefined();
      expect(json.meta).toBeDefined();
    });

    test("filters by name", async () => {
      await ctx.app.request("/admin/upstreams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "unique-upstream",
          algorithm: "round-robin",
        }),
      });

      const response = await ctx.app.request("/admin/upstreams?name=unique");

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.data).toHaveLength(1);
      expect(json.data[0].name).toBe("unique-upstream");
    });
  });

  describe("GET /admin/upstreams/:id", () => {
    test("gets an upstream by id", async () => {
      const createResponse = await ctx.app.request("/admin/upstreams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "test-upstream",
          algorithm: "round-robin",
        }),
      });
      const created = await createResponse.json();

      const response = await ctx.app.request(`/admin/upstreams/${created.data.id}`);

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.data.id).toBe(created.data.id);
      expect(json.data.name).toBe("test-upstream");
    });

    test("returns 404 for non-existent upstream", async () => {
      const response = await ctx.app.request("/admin/upstreams/non-existent-id");

      expect(response.status).toBe(404);
      const json = await response.json();
      expect(json.error).toBeDefined();
      expect(json.error.code).toBe("NOT_FOUND");
    });
  });

  describe("PUT /admin/upstreams/:id", () => {
    test("updates an upstream", async () => {
      const createResponse = await ctx.app.request("/admin/upstreams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "test-upstream",
          algorithm: "round-robin",
        }),
      });
      const created = await createResponse.json();

      const response = await ctx.app.request(`/admin/upstreams/${created.data.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "updated-upstream",
          algorithm: "least-connections",
        }),
      });

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.data.name).toBe("updated-upstream");
      expect(json.data.algorithm).toBe("least-connections");
    });

    test("returns 404 for non-existent upstream", async () => {
      const response = await ctx.app.request("/admin/upstreams/non-existent-id", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "updated-name" }),
      });

      expect(response.status).toBe(404);
      const json = await response.json();
      expect(json.error).toBeDefined();
    });
  });

  describe("DELETE /admin/upstreams/:id", () => {
    test("deletes an upstream", async () => {
      const createResponse = await ctx.app.request("/admin/upstreams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "test-upstream",
          algorithm: "round-robin",
        }),
      });
      const created = await createResponse.json();

      const deleteResponse = await ctx.app.request(`/admin/upstreams/${created.data.id}`, {
        method: "DELETE",
      });

      expect(deleteResponse.status).toBe(200);
      const deleteJson = await deleteResponse.json();
      expect(deleteJson.data.deleted).toBe(true);

      // Verify upstream is deleted
      const getResponse = await ctx.app.request(`/admin/upstreams/${created.data.id}`);
      expect(getResponse.status).toBe(404);
    });

    test("returns 404 for non-existent upstream", async () => {
      const response = await ctx.app.request("/admin/upstreams/non-existent-id", {
        method: "DELETE",
      });

      expect(response.status).toBe(404);
      const json = await response.json();
      expect(json.error).toBeDefined();
    });
  });
});
