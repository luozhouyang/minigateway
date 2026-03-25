// Admin API - Public Exports

// Server
export { createAdminApi, type AdminApiOptions } from "./server.js";

// Schemas (for external validation if needed)
export * from "./schemas.js";

// Types
export type * from "./types.js";

// Response helpers
export {
  toServiceResponse,
  toRouteResponse,
  toUpstreamResponse,
  toTargetResponse,
  toConsumerResponse,
  toPluginResponse,
  toCredentialResponse,
  toLlmProviderResponse,
  toLlmModelResponse,
  successResponse,
  listResponse,
  errorResponse,
  parsePagination,
} from "./responses.js";

// Error handling
export { errorHandler, ApiError } from "./middleware/error-handler.js";

// Routes (for custom mounting)
export { createServicesRoutes } from "./routes/services.js";
export { createRoutesRoutes } from "./routes/routes.js";
export { createUpstreamsRoutes } from "./routes/upstreams.js";
export { createTargetsRoutes } from "./routes/targets.js";
export { createConsumersRoutes } from "./routes/consumers.js";
export { createCredentialsRoutes } from "./routes/credentials.js";
export { createLlmProvidersRoutes } from "./routes/llm-providers.js";
export { createLlmModelsRoutes } from "./routes/llm-models.js";
export { createPluginsRoutes } from "./routes/plugins.js";
