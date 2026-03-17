// Upstreams Routes

import { Hono } from "hono";
import { zodValidator } from "../middleware/zod-validator.js";
import {
  createUpstreamSchema,
  updateUpstreamSchema,
  paginationSchema,
  upstreamFilterSchema,
} from "../schemas.js";
import { toUpstreamResponse, successResponse, listResponse } from "../responses.js";
import { ApiError } from "../server.js";
import { UpstreamRepository } from "../../entities/upstream.js";
import { DatabaseService } from "../../storage/database.js";

export function createUpstreamsRoutes(db: DatabaseService) {
  const routes = new Hono();
  const upstreamRepo = new UpstreamRepository(db);

  // List upstreams
  routes.get(
    "/",
    zodValidator("query", paginationSchema.merge(upstreamFilterSchema)),
    async (c) => {
      const query = c.req.valid("query");
      const { limit, offset } = query;

      const upstreams = await upstreamRepo.findAll({
        limit,
        offset,
        orderBy: "createdAt",
        order: "desc",
      });

      // Apply filters
      const filtered = upstreams.filter((u) => {
        if (query.name && !u.name.toLowerCase().includes(query.name.toLowerCase())) return false;
        if (query.algorithm && u.algorithm !== query.algorithm) return false;
        return true;
      });

      const total = filtered.length;

      return c.json(
        listResponse(filtered.map(toUpstreamResponse), {
          limit,
          offset,
          total,
          hasMore: offset + limit < total,
        }),
      );
    },
  );

  // Create upstream
  routes.post("/", zodValidator("json", createUpstreamSchema), async (c) => {
    const body = c.req.valid("json");

    const upstream = await upstreamRepo.create({
      name: body.name,
      algorithm: body.algorithm,
      hashOn: body.hashOn,
      hashFallback: body.hashFallback,
      slots: body.slots,
      healthcheck: body.healthcheck ?? null,
      tags: body.tags ?? [],
    });

    return c.json(successResponse(toUpstreamResponse(upstream)), 201);
  });

  // Get upstream
  routes.get("/:id", async (c) => {
    const { id } = c.req.param();
    const upstream = await upstreamRepo.findById(id);

    if (!upstream) {
      throw ApiError.notFound("Upstream");
    }

    return c.json(successResponse(toUpstreamResponse(upstream)));
  });

  // Update upstream
  routes.put("/:id", zodValidator("json", updateUpstreamSchema), async (c) => {
    const { id } = c.req.param();
    const body = c.req.valid("json");

    const upstream = await upstreamRepo.findById(id);
    if (!upstream) {
      throw ApiError.notFound("Upstream");
    }

    const updated = await upstreamRepo.update(id, {
      name: body.name,
      algorithm: body.algorithm,
      hashOn: body.hashOn,
      hashFallback: body.hashFallback,
      slots: body.slots,
      healthcheck: body.healthcheck ?? null,
      tags: body.tags ?? (upstream.tags as string[]),
    });

    return c.json(successResponse(toUpstreamResponse(updated)));
  });

  // Delete upstream
  routes.delete("/:id", async (c) => {
    const { id } = c.req.param();

    const upstream = await upstreamRepo.findById(id);
    if (!upstream) {
      throw ApiError.notFound("Upstream");
    }

    await upstreamRepo.delete(id);
    return c.json(successResponse({ deleted: true }), 200);
  });

  return routes;
}
