// Services Routes Tests

import { test, expect, beforeEach, afterEach, describe } from "vite-plus/test";
import { createTestContext, destroyTestContext } from "../test-utils.js";
import type { TestContext } from "../test-utils.js";

describe("Services Routes", () => {
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = await createTestContext();
  });

  afterEach(() => {
    destroyTestContext(ctx);
  });

  describe("POST /admin/services", () => {
    test("creates a service", async () => {
      const body = {
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
      };

      const response = await ctx.app.request("/admin/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      expect(response.status).toBe(201);
      const json = await response.json();
      expect(json.data).toBeDefined();
      expect(json.data.name).toBe("test-service");
      expect(json.data.protocol).toBe("http");
      expect(json.data.host).toBe("localhost");
      expect(json.data.port).toBe(8080);
    });

    test("returns 400 for missing required fields", async () => {
      const body = { name: "" };

      const response = await ctx.app.request("/admin/services", {
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

  describe("GET /admin/services", () => {
    test("lists all services", async () => {
      // Create first service
      await ctx.app.request("/admin/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "service-1",
          url: "http://localhost:8080",
          protocol: "http",
          host: "localhost",
          port: 8080,
        }),
      });

      // Create second service
      await ctx.app.request("/admin/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "service-2",
          url: "https://api.example.com",
          protocol: "https",
          host: "api.example.com",
          port: 443,
        }),
      });

      const response = await ctx.app.request("/admin/services");

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.data).toHaveLength(2);
    });

    test("supports pagination", async () => {
      const response = await ctx.app.request("/admin/services?limit=5&offset=0");

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.data).toBeDefined();
      expect(json.meta).toBeDefined();
    });

    test("filters by name", async () => {
      await ctx.app.request("/admin/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "unique-service",
          url: "http://localhost:8080",
          protocol: "http",
          host: "localhost",
          port: 8080,
        }),
      });

      const response = await ctx.app.request("/admin/services?name=unique");

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.data).toHaveLength(1);
      expect(json.data[0].name).toBe("unique-service");
    });
  });

  describe("GET /admin/services/:id", () => {
    test("gets a service by id", async () => {
      const createResponse = await ctx.app.request("/admin/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "test-service",
          url: "http://localhost:8080",
          protocol: "http",
          host: "localhost",
          port: 8080,
        }),
      });
      const created = await createResponse.json();

      const response = await ctx.app.request(`/admin/services/${created.data.id}`);

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.data.id).toBe(created.data.id);
      expect(json.data.name).toBe("test-service");
    });

    test("returns 404 for non-existent service", async () => {
      const response = await ctx.app.request("/admin/services/non-existent-id");

      expect(response.status).toBe(404);
      const json = await response.json();
      expect(json.error).toBeDefined();
      expect(json.error.code).toBe("NOT_FOUND");
    });
  });

  describe("PUT /admin/services/:id", () => {
    test("updates a service", async () => {
      const createResponse = await ctx.app.request("/admin/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "test-service",
          url: "http://localhost:8080",
          protocol: "http",
          host: "localhost",
          port: 8080,
        }),
      });
      const created = await createResponse.json();

      const response = await ctx.app.request(`/admin/services/${created.data.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          port: 9090,
          tags: ["updated"],
        }),
      });

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.data.port).toBe(9090);
      expect(json.data.tags).toContain("updated");
    });

    test("returns 404 for non-existent service", async () => {
      const response = await ctx.app.request("/admin/services/non-existent-id", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "updated-name" }),
      });

      expect(response.status).toBe(404);
      const json = await response.json();
      expect(json.error).toBeDefined();
    });
  });

  describe("DELETE /admin/services/:id", () => {
    test("deletes a service", async () => {
      const createResponse = await ctx.app.request("/admin/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "test-service",
          url: "http://localhost:8080",
          protocol: "http",
          host: "localhost",
          port: 8080,
        }),
      });
      const created = await createResponse.json();

      const deleteResponse = await ctx.app.request(`/admin/services/${created.data.id}`, {
        method: "DELETE",
      });

      expect(deleteResponse.status).toBe(200);
      const deleteJson = await deleteResponse.json();
      expect(deleteJson.data.deleted).toBe(true);

      // Verify service is deleted
      const getResponse = await ctx.app.request(`/admin/services/${created.data.id}`);
      expect(getResponse.status).toBe(404);
    });

    test("returns 404 for non-existent service", async () => {
      const response = await ctx.app.request("/admin/services/non-existent-id", {
        method: "DELETE",
      });

      expect(response.status).toBe(404);
      const json = await response.json();
      expect(json.error).toBeDefined();
    });
  });
});
