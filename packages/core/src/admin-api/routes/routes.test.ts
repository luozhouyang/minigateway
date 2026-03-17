// Routes Routes Tests

import { test, expect, beforeEach, afterEach, describe } from "vite-plus/test";
import { createTestContext, destroyTestContext } from "../test-utils.js";
import type { TestContext } from "../test-utils.js";

describe("Routes Routes", () => {
  let ctx: TestContext;

  beforeEach(() => {
    ctx = createTestContext();
  });

  afterEach(() => {
    destroyTestContext(ctx);
  });

  describe("POST /admin/routes", () => {
    test("creates a route", async () => {
      const body = {
        name: "test-route",
        protocols: ["http", "https"],
        methods: ["GET", "POST"],
        paths: ["/api/*"],
        stripPath: false,
        preserveHost: false,
      };

      const response = await ctx.app.request("/admin/routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      expect(response.status).toBe(201);
      const json = await response.json();
      expect(json.data).toBeDefined();
      expect(json.data.name).toBe("test-route");
      expect(json.data.protocols).toEqual(["http", "https"]);
      expect(json.data.methods).toEqual(["GET", "POST"]);
      expect(json.data.paths).toEqual(["/api/*"]);
    });

    test("returns 400 for missing required fields", async () => {
      const body = { name: "" };

      const response = await ctx.app.request("/admin/routes", {
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

  describe("GET /admin/routes", () => {
    test("lists all routes", async () => {
      await ctx.app.request("/admin/routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "route-1",
          paths: ["/api/v1/*"],
        }),
      });

      await ctx.app.request("/admin/routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "route-2",
          paths: ["/api/v2/*"],
        }),
      });

      const response = await ctx.app.request("/admin/routes");

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.data).toHaveLength(2);
    });

    test("supports pagination", async () => {
      const response = await ctx.app.request("/admin/routes?limit=5&offset=0");

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.data).toBeDefined();
      expect(json.meta).toBeDefined();
    });

    test("filters by name", async () => {
      await ctx.app.request("/admin/routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "unique-route",
          paths: ["/unique/*"],
        }),
      });

      const response = await ctx.app.request("/admin/routes?name=unique");

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.data).toHaveLength(1);
      expect(json.data[0].name).toBe("unique-route");
    });
  });

  describe("GET /admin/routes/:id", () => {
    test("gets a route by id", async () => {
      const createResponse = await ctx.app.request("/admin/routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "test-route",
          paths: ["/api/*"],
        }),
      });
      const created = await createResponse.json();

      const response = await ctx.app.request(`/admin/routes/${created.data.id}`);

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.data.id).toBe(created.data.id);
      expect(json.data.name).toBe("test-route");
    });

    test("returns 404 for non-existent route", async () => {
      const response = await ctx.app.request("/admin/routes/non-existent-id");

      expect(response.status).toBe(404);
      const json = await response.json();
      expect(json.error).toBeDefined();
      expect(json.error.code).toBe("NOT_FOUND");
    });
  });

  describe("PUT /admin/routes/:id", () => {
    test("updates a route", async () => {
      const createResponse = await ctx.app.request("/admin/routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "test-route",
          paths: ["/api/*"],
        }),
      });
      const created = await createResponse.json();

      const response = await ctx.app.request(`/admin/routes/${created.data.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "updated-route",
          stripPath: true,
        }),
      });

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.data.name).toBe("updated-route");
      expect(json.data.stripPath).toBe(true);
    });

    test("returns 404 for non-existent route", async () => {
      const response = await ctx.app.request("/admin/routes/non-existent-id", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "updated-name" }),
      });

      expect(response.status).toBe(404);
      const json = await response.json();
      expect(json.error).toBeDefined();
    });
  });

  describe("DELETE /admin/routes/:id", () => {
    test("deletes a route", async () => {
      const createResponse = await ctx.app.request("/admin/routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "test-route",
          paths: ["/api/*"],
        }),
      });
      const created = await createResponse.json();

      const deleteResponse = await ctx.app.request(`/admin/routes/${created.data.id}`, {
        method: "DELETE",
      });

      expect(deleteResponse.status).toBe(200);
      const deleteJson = await deleteResponse.json();
      expect(deleteJson.data.deleted).toBe(true);

      // Verify route is deleted
      const getResponse = await ctx.app.request(`/admin/routes/${created.data.id}`);
      expect(getResponse.status).toBe(404);
    });

    test("returns 404 for non-existent route", async () => {
      const response = await ctx.app.request("/admin/routes/non-existent-id", {
        method: "DELETE",
      });

      expect(response.status).toBe(404);
      const json = await response.json();
      expect(json.error).toBeDefined();
    });
  });
});
