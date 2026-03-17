// Consumers Routes

import { Hono } from "hono";
import { zodValidator } from "../middleware/zod-validator.js";
import {
  createConsumerSchema,
  updateConsumerSchema,
  paginationSchema,
  consumerFilterSchema,
} from "../schemas.js";
import { toConsumerResponse, successResponse, listResponse } from "../responses.js";
import { ApiError } from "../server.js";
import { ConsumerRepository } from "../../entities/consumer.js";
import { DatabaseService } from "../../storage/database.js";

export function createConsumersRoutes(db: DatabaseService) {
  const routes = new Hono();
  const consumerRepo = new ConsumerRepository(db);

  // List consumers
  routes.get(
    "/",
    zodValidator("query", paginationSchema.merge(consumerFilterSchema)),
    async (c) => {
      const query = c.req.valid("query");
      const { limit, offset } = query;

      const consumers = await consumerRepo.findAll({
        limit,
        offset,
        orderBy: "createdAt",
        order: "desc",
      });

      // Apply filters
      const filtered = consumers.filter((c) => {
        if (query.username && !c.username?.includes(query.username)) return false;
        if (query.customId && !c.customId?.includes(query.customId)) return false;
        return true;
      });

      const total = filtered.length;

      return c.json(
        listResponse(filtered.map(toConsumerResponse), {
          limit,
          offset,
          total,
          hasMore: offset + limit < total,
        }),
      );
    },
  );

  // Create consumer
  routes.post("/", zodValidator("json", createConsumerSchema), async (c) => {
    const body = c.req.valid("json");

    const consumer = await consumerRepo.create({
      username: body.username ?? null,
      customId: body.customId ?? null,
      tags: body.tags ?? [],
    });

    return c.json(successResponse(toConsumerResponse(consumer)), 201);
  });

  // Get consumer
  routes.get("/:id", async (c) => {
    const { id } = c.req.param();
    const consumer = await consumerRepo.findById(id);

    if (!consumer) {
      throw ApiError.notFound("Consumer");
    }

    return c.json(successResponse(toConsumerResponse(consumer)));
  });

  // Update consumer
  routes.put("/:id", zodValidator("json", updateConsumerSchema), async (c) => {
    const { id } = c.req.param();
    const body = c.req.valid("json");

    const consumer = await consumerRepo.findById(id);
    if (!consumer) {
      throw ApiError.notFound("Consumer");
    }

    const updated = await consumerRepo.update(id, {
      username: body.username ?? null,
      customId: body.customId ?? null,
      tags: body.tags ?? (consumer.tags as string[]),
    });

    return c.json(successResponse(toConsumerResponse(updated)));
  });

  // Delete consumer
  routes.delete("/:id", async (c) => {
    const { id } = c.req.param();

    const consumer = await consumerRepo.findById(id);
    if (!consumer) {
      throw ApiError.notFound("Consumer");
    }

    await consumerRepo.delete(id);
    return c.json(successResponse({ deleted: true }), 200);
  });

  return routes;
}
