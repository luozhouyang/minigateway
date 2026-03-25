import { Hono } from "hono";
import { zodValidator } from "../middleware/zod-validator.js";
import {
  createLlmModelSchema,
  llmModelFilterSchema,
  paginationSchema,
  updateLlmModelSchema,
} from "../schemas.js";
import { listResponse, successResponse, toLlmModelResponse } from "../responses.js";
import { ApiError } from "../server.js";
import { LlmModelRepository } from "../../entities/llm-model.js";
import { LlmProviderRepository } from "../../entities/llm-provider.js";
import { DatabaseService } from "../../storage/database.js";

export function createLlmModelsRoutes(db: DatabaseService) {
  const routes = new Hono();
  const modelRepo = new LlmModelRepository(db);
  const providerRepo = new LlmProviderRepository(db);

  routes.get("/", zodValidator("query", paginationSchema.merge(llmModelFilterSchema)), async (c) => {
    const query = c.req.valid("query");
    const { limit, offset } = query;
    const providerId = await resolveProviderId(providerRepo, query.providerId, query.providerName);

    const models = await modelRepo.search({
      providerId,
      name: query.name,
      enabled: query.enabled,
      limit,
      offset,
    });
    const total = await modelRepo
      .search({
        providerId,
        name: query.name,
        enabled: query.enabled,
      })
      .then((items) => items.length);

    return c.json(
      listResponse(models.map(toLlmModelResponse), {
        limit,
        offset,
        total,
        hasMore: offset + limit < total,
      }),
    );
  });

  routes.post("/", zodValidator("json", createLlmModelSchema), async (c) => {
    const body = c.req.valid("json");
    const provider = await providerRepo.findById(body.providerId);
    if (!provider) {
      throw ApiError.badRequest(`Unknown LLM provider: ${body.providerId}`);
    }

    const existing = await modelRepo.findByProviderAndName(body.providerId, body.name);
    if (existing) {
      throw ApiError.conflict(
        `LLM model "${body.name}" already exists for provider "${provider.name}"`,
      );
    }

    const model = await modelRepo.create({
      providerId: body.providerId,
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
    const model = await modelRepo.findById(id);
    if (!model) {
      throw ApiError.notFound("LLM model");
    }

    return c.json(successResponse(toLlmModelResponse(model)));
  });

  routes.put("/:id", zodValidator("json", updateLlmModelSchema), async (c) => {
    const { id } = c.req.param();
    const body = c.req.valid("json");
    const model = await modelRepo.findById(id);
    if (!model) {
      throw ApiError.notFound("LLM model");
    }

    const providerId = body.providerId ?? model.providerId;
    if (body.providerId) {
      const provider = await providerRepo.findById(body.providerId);
      if (!provider) {
        throw ApiError.badRequest(`Unknown LLM provider: ${body.providerId}`);
      }
    }

    if (body.name && (body.name !== model.name || providerId !== model.providerId)) {
      const existing = await modelRepo.findByProviderAndName(providerId, body.name);
      if (existing && existing.id !== id) {
        throw ApiError.conflict(
          `LLM model "${body.name}" already exists for provider "${providerId}"`,
        );
      }
    }

    const updated = await modelRepo.update(id, {
      providerId,
      name: body.name,
      upstreamModel: body.upstreamModel,
      enabled: body.enabled,
      metadata: body.metadata,
      tags: body.tags ?? (model.tags as string[]),
    });

    return c.json(successResponse(toLlmModelResponse(updated)));
  });

  routes.delete("/:id", async (c) => {
    const { id } = c.req.param();
    const model = await modelRepo.findById(id);
    if (!model) {
      throw ApiError.notFound("LLM model");
    }

    await modelRepo.delete(id);
    return c.json(successResponse({ deleted: true }));
  });

  return routes;
}

async function resolveProviderId(
  providerRepo: LlmProviderRepository,
  providerId?: string,
  providerName?: string,
): Promise<string | undefined> {
  if (providerId) {
    return providerId;
  }

  if (!providerName) {
    return undefined;
  }

  const provider = await providerRepo.findByName(providerName);
  if (!provider) {
    throw ApiError.badRequest(`Unknown LLM provider: ${providerName}`);
  }

  return provider.id;
}
