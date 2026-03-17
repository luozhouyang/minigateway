// Targets Routes

import { Hono } from "hono";
import { zodValidator } from "../middleware/zod-validator.js";
import { createTargetSchema, updateTargetSchema } from "../schemas.js";
import { toTargetResponse, successResponse, listResponse } from "../responses.js";
import { ApiError } from "../server.js";
import { TargetRepository } from "../../entities/target.js";
import { UpstreamRepository } from "../../entities/upstream.js";
import { DatabaseService } from "../../storage/database.js";

export function createTargetsRoutes(db: DatabaseService) {
  const routes = new Hono();
  const targetRepo = new TargetRepository(db);
  const upstreamRepo = new UpstreamRepository(db);

  // List targets for an upstream
  routes.get("/upstreams/:upstreamId/targets", async (c) => {
    const { upstreamId } = c.req.param();
    const limit = parseInt(c.req.query("limit") || "20", 10);
    const offset = parseInt(c.req.query("offset") || "0", 10);

    // Verify upstream exists
    const upstream = await upstreamRepo.findById(upstreamId);
    if (!upstream) {
      throw ApiError.notFound("Upstream");
    }

    const targets = await targetRepo.findAll({
      limit,
      offset,
      orderBy: "createdAt",
      order: "desc",
    });

    // Filter by upstream
    const filtered = targets.filter((t) => t.upstreamId === upstreamId);
    const total = filtered.length;

    return c.json(
      listResponse(filtered.map(toTargetResponse), {
        limit,
        offset,
        total,
        hasMore: offset + limit < total,
      }),
    );
  });

  // Create target
  routes.post(
    "/upstreams/:upstreamId/targets",
    zodValidator("json", createTargetSchema),
    async (c) => {
      const { upstreamId } = c.req.param();
      const body = c.req.valid("json");

      // Verify upstream exists
      const upstream = await upstreamRepo.findById(upstreamId);
      if (!upstream) {
        throw ApiError.notFound("Upstream");
      }

      const target = await targetRepo.create({
        upstreamId,
        target: body.target,
        weight: body.weight ?? 100,
        tags: body.tags ?? [],
      });

      return c.json(successResponse(toTargetResponse(target)), 201);
    },
  );

  // Get target
  routes.get("/upstreams/:upstreamId/targets/:targetId", async (c) => {
    const { targetId } = c.req.param();
    const target = await targetRepo.findById(targetId);

    if (!target) {
      throw ApiError.notFound("Target");
    }

    return c.json(successResponse(toTargetResponse(target)));
  });

  // Update target
  routes.put(
    "/upstreams/:upstreamId/targets/:targetId",
    zodValidator("json", updateTargetSchema),
    async (c) => {
      const { targetId } = c.req.param();
      const body = c.req.valid("json");

      const target = await targetRepo.findById(targetId);
      if (!target) {
        throw ApiError.notFound("Target");
      }

      const updated = await targetRepo.update(targetId, {
        target: body.target,
        weight: body.weight,
        tags: body.tags ?? (target.tags as string[]),
      });

      return c.json(successResponse(toTargetResponse(updated)));
    },
  );

  // Delete target
  routes.delete("/upstreams/:upstreamId/targets/:targetId", async (c) => {
    const { targetId } = c.req.param();

    const target = await targetRepo.findById(targetId);
    if (!target) {
      throw ApiError.notFound("Target");
    }

    await targetRepo.delete(targetId);
    return c.json(successResponse({ deleted: true }), 200);
  });

  return routes;
}
