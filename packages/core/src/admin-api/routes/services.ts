// Services Routes

import { Hono } from "hono";
import { zodValidator } from "../middleware/zod-validator.js";
import {
  createServiceSchema,
  updateServiceSchema,
  paginationSchema,
  serviceFilterSchema,
} from "../schemas.js";
import { toServiceResponse, successResponse, listResponse } from "../responses.js";
import { ApiError } from "../server.js";
import { ServiceRepository } from "../../entities/service.js";
import { DatabaseService } from "../../storage/database.js";

export function createServicesRoutes(db: DatabaseService) {
  const routes = new Hono();
  const serviceRepo = new ServiceRepository(db);

  // List services
  routes.get("/", zodValidator("query", paginationSchema.merge(serviceFilterSchema)), async (c) => {
    const query = c.req.valid("query");
    const { limit, offset } = query;

    // Use repository search method for filtering
    const services = await serviceRepo.search({
      name: query.name,
      protocol: query.protocol,
      limit,
      offset,
    });

    const total = await serviceRepo.findAll().then((all) => all.length);

    return c.json(
      listResponse(services.map(toServiceResponse), {
        limit,
        offset,
        total,
        hasMore: offset + limit < total,
      }),
    );
  });

  // Create service
  routes.post("/", zodValidator("json", createServiceSchema), async (c) => {
    const body = c.req.valid("json");

    const service = await serviceRepo.create({
      name: body.name,
      url: body.url ?? null,
      protocol: body.protocol,
      host: body.host ?? null,
      port: body.port ?? null,
      path: body.path ?? null,
      connectTimeout: body.connectTimeout,
      writeTimeout: body.writeTimeout,
      readTimeout: body.readTimeout,
      retries: body.retries,
      tags: body.tags ?? [],
    });

    return c.json(successResponse(toServiceResponse(service)), 201);
  });

  // Get service
  routes.get("/:id", async (c) => {
    const { id } = c.req.param();
    const service = await serviceRepo.findById(id);

    if (!service) {
      throw ApiError.notFound("Service");
    }

    return c.json(successResponse(toServiceResponse(service)));
  });

  // Update service
  routes.put("/:id", zodValidator("json", updateServiceSchema), async (c) => {
    const { id } = c.req.param();
    const body = c.req.valid("json");

    const service = await serviceRepo.findById(id);
    if (!service) {
      throw ApiError.notFound("Service");
    }

    const updated = await serviceRepo.update(id, {
      name: body.name,
      url: body.url ?? null,
      protocol: body.protocol,
      host: body.host ?? null,
      port: body.port ?? null,
      path: body.path ?? null,
      connectTimeout: body.connectTimeout,
      writeTimeout: body.writeTimeout,
      readTimeout: body.readTimeout,
      retries: body.retries,
      tags: body.tags ?? (service.tags as string[]),
    });

    return c.json(successResponse(toServiceResponse(updated)));
  });

  // Delete service
  routes.delete("/:id", async (c) => {
    const { id } = c.req.param();

    const service = await serviceRepo.findById(id);
    if (!service) {
      throw ApiError.notFound("Service");
    }

    await serviceRepo.delete(id);
    return c.json(successResponse({ deleted: true }), 200);
  });

  return routes;
}
