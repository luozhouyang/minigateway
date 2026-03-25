import { Hono } from "hono";
import { zodValidator } from "../middleware/zod-validator.js";
import {
  createLlmModelSchema,
  createLlmProviderSchema,
  llmProviderFilterSchema,
  paginationSchema,
  updateLlmProviderSchema,
} from "../schemas.js";
import {
  listResponse,
  successResponse,
  toLlmModelResponse,
  toLlmProviderResponse,
} from "../responses.js";
import { ApiError } from "../server.js";
import { LlmModelRepository } from "../../entities/llm-model.js";
import { LlmProviderRepository } from "../../entities/llm-provider.js";
import { DatabaseService } from "../../storage/database.js";

export function createLlmProvidersRoutes(db: DatabaseService) {
  const routes = new Hono();
  const providerRepo = new LlmProviderRepository(db);
  const modelRepo = new LlmModelRepository(db);

  routes.get(
    "/",
    zodValidator("query", paginationSchema.merge(llmProviderFilterSchema)),
    async (c) => {
      const query = c.req.valid("query");
      const { limit, offset } = query;

      const providers = await providerRepo.search({
        name: query.name,
        vendor: query.vendor,
        protocol: query.protocol,
        enabled: query.enabled,
        limit,
        offset,
      });
      const total = await providerRepo
        .search({
          name: query.name,
          vendor: query.vendor,
          protocol: query.protocol,
          enabled: query.enabled,
        })
        .then((items) => items.length);

      return c.json(
        listResponse(providers.map(toLlmProviderResponse), {
          limit,
          offset,
          total,
          hasMore: offset + limit < total,
        }),
      );
    },
  );

  routes.post("/", zodValidator("json", createLlmProviderSchema), async (c) => {
    const body = c.req.valid("json");
    const provider = await providerRepo.create({
      name: body.name,
      displayName: body.displayName ?? body.name,
      vendor: body.vendor,
      enabled: body.enabled ?? true,
      protocol: body.protocol,
      baseUrl: body.baseUrl,
      clients: body.clients,
      headers: body.headers ?? {},
      auth: body.auth ?? { type: "none" },
      adapterConfig: body.adapterConfig ?? {},
      tags: body.tags ?? [],
    });

    return c.json(successResponse(toLlmProviderResponse(provider)), 201);
  });

  routes.get("/:id/models", zodValidator("query", paginationSchema), async (c) => {
    const { id } = c.req.param();
    const { limit, offset } = c.req.valid("query");
    const provider = await providerRepo.findById(id);
    if (!provider) {
      throw ApiError.notFound("LLM provider");
    }

    const models = await modelRepo.search({
      providerId: id,
      limit,
      offset,
    });
    const total = await modelRepo.search({ providerId: id }).then((items) => items.length);

    return c.json(
      listResponse(models.map(toLlmModelResponse), {
        limit,
        offset,
        total,
        hasMore: offset + limit < total,
      }),
    );
  });

  routes.post("/:id/models", zodValidator("json", createLlmModelSchema.omit({ providerId: true })), async (c) => {
    const { id } = c.req.param();
    const provider = await providerRepo.findById(id);
    if (!provider) {
      throw ApiError.notFound("LLM provider");
    }

    const body = c.req.valid("json");
    const model = await modelRepo.create({
      providerId: id,
      name: body.name,
      upstreamModel: body.upstreamModel,
      enabled: body.enabled ?? true,
      metadata: body.metadata ?? {},
      tags: body.tags ?? [],
    });

    return c.json(successResponse(toLlmModelResponse(model)), 201);
  });

  routes.get("/:id", async (c) => {
    const { id } = c.req.param();
    const provider = await providerRepo.findById(id);
    if (!provider) {
      throw ApiError.notFound("LLM provider");
    }

    return c.json(successResponse(toLlmProviderResponse(provider)));
  });

  routes.put("/:id", zodValidator("json", updateLlmProviderSchema), async (c) => {
    const { id } = c.req.param();
    const body = c.req.valid("json");
    const provider = await providerRepo.findById(id);
    if (!provider) {
      throw ApiError.notFound("LLM provider");
    }

    const updated = await providerRepo.update(id, {
      name: body.name,
      displayName: body.displayName,
      vendor: body.vendor,
      enabled: body.enabled,
      protocol: body.protocol,
      baseUrl: body.baseUrl,
      clients: body.clients,
      headers: body.headers,
      auth: body.auth,
      adapterConfig: body.adapterConfig,
      tags: body.tags ?? (provider.tags as string[]),
    });

    return c.json(successResponse(toLlmProviderResponse(updated)));
  });

  routes.delete("/:id", async (c) => {
    const { id } = c.req.param();
    const provider = await providerRepo.findById(id);
    if (!provider) {
      throw ApiError.notFound("LLM provider");
    }

    await providerRepo.delete(id);
    return c.json(successResponse({ deleted: true }));
  });

  return routes;
}
