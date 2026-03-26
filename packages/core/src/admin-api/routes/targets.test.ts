// Targets Routes Tests

import { test, expect, beforeEach, afterEach, describe } from "vite-plus/test";
import { createTestContext, destroyTestContext } from "../test-utils.js";
import type { TestContext } from "../test-utils.js";

describe("Targets Routes", () => {
  let ctx: TestContext;
  let upstreamId: string;

  beforeEach(async () => {
    ctx = await createTestContext();

    // Create an upstream for the tests
    const createResponse = await ctx.app.request("/admin/upstreams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "test-upstream",
        algorithm: "round-robin",
      }),
    });
    const created = await createResponse.json();
    upstreamId = created.data.id;
  });

  afterEach(() => {
    destroyTestContext(ctx);
  });

  describe("POST /admin/upstreams/:upstreamId/targets", () => {
    test("creates a target", async () => {
      const body = {
        target: "localhost:8080",
        weight: 100,
        tags: ["test"],
      };

      const response = await ctx.app.request(`/admin/upstreams/${upstreamId}/targets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      expect(response.status).toBe(201);
      const json = await response.json();
      expect(json.data).toBeDefined();
      expect(json.data.target).toBe("localhost:8080");
      expect(json.data.weight).toBe(100);
      expect(json.data.upstreamId).toBe(upstreamId);
    });

    test("returns 404 for non-existent upstream", async () => {
      const body = {
        target: "localhost:8080",
        weight: 100,
      };

      const response = await ctx.app.request("/admin/upstreams/non-existent-id/targets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      expect(response.status).toBe(404);
      const json = await response.json();
      expect(json.error).toBeDefined();
      expect(json.error.code).toBe("NOT_FOUND");
    });
  });

  describe("GET /admin/upstreams/:upstreamId/targets", () => {
    test("lists all targets for an upstream", async () => {
      await ctx.app.request(`/admin/upstreams/${upstreamId}/targets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target: "target-1:8080",
          weight: 100,
        }),
      });

      await ctx.app.request(`/admin/upstreams/${upstreamId}/targets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target: "target-2:8080",
          weight: 50,
        }),
      });

      const response = await ctx.app.request(`/admin/upstreams/${upstreamId}/targets`);

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.data).toHaveLength(2);
    });

    test("returns empty list for upstream with no targets", async () => {
      const response = await ctx.app.request(`/admin/upstreams/${upstreamId}/targets`);

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.data).toHaveLength(0);
    });
  });

  describe("GET /admin/upstreams/:upstreamId/targets/:targetId", () => {
    test("gets a target by id", async () => {
      const createResponse = await ctx.app.request(`/admin/upstreams/${upstreamId}/targets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target: "localhost:8080",
          weight: 100,
        }),
      });
      const created = await createResponse.json();

      const response = await ctx.app.request(
        `/admin/upstreams/${upstreamId}/targets/${created.data.id}`,
      );

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.data.id).toBe(created.data.id);
      expect(json.data.target).toBe("localhost:8080");
    });

    test("returns 404 for non-existent target", async () => {
      const response = await ctx.app.request(
        `/admin/upstreams/${upstreamId}/targets/non-existent-id`,
      );

      expect(response.status).toBe(404);
      const json = await response.json();
      expect(json.error).toBeDefined();
    });
  });

  describe("PUT /admin/upstreams/:upstreamId/targets/:targetId", () => {
    test("updates a target", async () => {
      const createResponse = await ctx.app.request(`/admin/upstreams/${upstreamId}/targets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target: "localhost:8080",
          weight: 100,
        }),
      });
      const created = await createResponse.json();

      const response = await ctx.app.request(
        `/admin/upstreams/${upstreamId}/targets/${created.data.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            weight: 200,
            tags: ["updated"],
          }),
        },
      );

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.data.weight).toBe(200);
      expect(json.data.tags).toContain("updated");
    });

    test("returns 404 for non-existent target", async () => {
      const response = await ctx.app.request(
        `/admin/upstreams/${upstreamId}/targets/non-existent-id`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ weight: 200 }),
        },
      );

      expect(response.status).toBe(404);
      const json = await response.json();
      expect(json.error).toBeDefined();
    });
  });

  describe("DELETE /admin/upstreams/:upstreamId/targets/:targetId", () => {
    test("deletes a target", async () => {
      const createResponse = await ctx.app.request(`/admin/upstreams/${upstreamId}/targets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target: "localhost:8080",
          weight: 100,
        }),
      });
      const created = await createResponse.json();

      const deleteResponse = await ctx.app.request(
        `/admin/upstreams/${upstreamId}/targets/${created.data.id}`,
        {
          method: "DELETE",
        },
      );

      expect(deleteResponse.status).toBe(200);
      const deleteJson = await deleteResponse.json();
      expect(deleteJson.data.deleted).toBe(true);

      // Verify target is deleted
      const getResponse = await ctx.app.request(
        `/admin/upstreams/${upstreamId}/targets/${created.data.id}`,
      );
      expect(getResponse.status).toBe(404);
    });

    test("returns 404 for non-existent target", async () => {
      const response = await ctx.app.request(
        `/admin/upstreams/${upstreamId}/targets/non-existent-id`,
        {
          method: "DELETE",
        },
      );

      expect(response.status).toBe(404);
      const json = await response.json();
      expect(json.error).toBeDefined();
    });
  });
});
