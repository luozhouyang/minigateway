// Routes Routes

import { Hono } from "hono";
import { zodValidator } from "../middleware/zod-validator.js";
import {
  createRouteSchema,
  updateRouteSchema,
  paginationSchema,
  routeFilterSchema,
} from "../schemas.js";
import { toRouteResponse, successResponse, listResponse } from "../responses.js";
import { ApiError } from "../server.js";
import { RouteRepository } from "../../entities/route.js";
import { DatabaseService } from "../../storage/database.js";

export function createRoutesRoutes(db: DatabaseService) {
  const routes = new Hono();
  const routeRepo = new RouteRepository(db);

  // List routes
  routes.get("/", zodValidator("query", paginationSchema.merge(routeFilterSchema)), async (c) => {
    const query = c.req.valid("query");
    const { limit, offset } = query;

    const allRoutes = await routeRepo.findAll({
      limit,
      offset,
      orderBy: "createdAt",
      order: "desc",
    });

    // Apply filters
    const filtered = allRoutes.filter((r) => {
      if (query.name && !r.name.toLowerCase().includes(query.name.toLowerCase())) return false;
      if (query.serviceId && r.serviceId !== query.serviceId) return false;
      if (query.method && r.methods && !r.methods.includes(query.method)) return false;
      if (
        query.path &&
        r.paths &&
        !r.paths.some((p) => p.toLowerCase().includes(query.path!.toLowerCase()))
      )
        return false;
      return true;
    });

    const total = filtered.length;

    return c.json(
      listResponse(filtered.map(toRouteResponse), {
        limit,
        offset,
        total,
        hasMore: offset + limit < total,
      }),
    );
  });

  // Create route
  routes.post("/", zodValidator("json", createRouteSchema), async (c) => {
    const body = c.req.valid("json");

    const route = await routeRepo.create({
      name: body.name,
      serviceId: body.serviceId ?? null,
      protocols: body.protocols ?? ["http", "https"],
      methods: body.methods ?? null,
      hosts: body.hosts ?? null,
      paths: body.paths ?? null,
      headers: body.headers as Record<string, string | string[]> | null,
      snis: body.snis ?? null,
      sources: body.sources ?? null,
      destinations: body.destinations ?? null,
      stripPath: body.stripPath ?? false,
      preserveHost: body.preserveHost ?? false,
      regexPriority: body.regexPriority ?? 0,
      pathHandling: body.pathHandling ?? "v0",
      tags: body.tags ?? [],
    });

    return c.json(successResponse(toRouteResponse(route)), 201);
  });

  // Get route
  routes.get("/:id", async (c) => {
    const { id } = c.req.param();
    const route = await routeRepo.findById(id);

    if (!route) {
      throw ApiError.notFound("Route");
    }

    return c.json(successResponse(toRouteResponse(route)));
  });

  // Update route
  routes.put("/:id", zodValidator("json", updateRouteSchema), async (c) => {
    const { id } = c.req.param();
    const body = c.req.valid("json");

    const route = await routeRepo.findById(id);
    if (!route) {
      throw ApiError.notFound("Route");
    }

    const updated = await routeRepo.update(id, {
      name: body.name,
      serviceId: body.serviceId ?? null,
      protocols: body.protocols ?? (route.protocols as string[]),
      methods: body.methods ?? null,
      hosts: body.hosts ?? null,
      paths: body.paths ?? null,
      headers: body.headers as Record<string, string | string[]> | null,
      snis: body.snis ?? null,
      sources: body.sources ?? null,
      destinations: body.destinations ?? null,
      stripPath: body.stripPath,
      preserveHost: body.preserveHost,
      regexPriority: body.regexPriority,
      pathHandling: body.pathHandling,
      tags: body.tags ?? (route.tags as string[]),
    });

    return c.json(successResponse(toRouteResponse(updated)));
  });

  // Delete route
  routes.delete("/:id", async (c) => {
    const { id } = c.req.param();

    const route = await routeRepo.findById(id);
    if (!route) {
      throw ApiError.notFound("Route");
    }

    await routeRepo.delete(id);
    return c.json(successResponse({ deleted: true }), 200);
  });

  return routes;
}
