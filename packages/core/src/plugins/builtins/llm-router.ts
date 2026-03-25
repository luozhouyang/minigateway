import type Database from "better-sqlite3";
import { cloneArrayBuffer, toFetchRequest, type HttpRequestState } from "../runtime.js";
import {
  LlmModelResourceSchema,
  LlmProviderResourceSchema,
  LlmRouterConfigSchema,
  type LlmRouterPluginConfig,
} from "../llm/config.js";
import { getNormalizedLlmRequest, setNormalizedLlmRequest } from "../llm/context.js";
import { parseLlmModelReference } from "../llm/model-reference.js";
import {
  getProviderAdapter,
  type StoredLlmModel,
  type StoredLlmProvider,
} from "../llm/provider-adapters.js";
import { normalizeLlmRequest } from "../llm/normalized-request.js";
import {
  type LlmClientProfile,
  type LlmInboundProtocol,
  type LlmProviderProtocol,
  type LlmProviderVendor,
  type NormalizedLlmRequest,
} from "../llm/types.js";
import type { PluginContext, PluginDefinition, PluginHandlerResult } from "../types.js";

type LlmRouterConfig = LlmRouterPluginConfig;
type CircuitState = "closed" | "open" | "half-open";

interface CircuitSnapshot {
  state: CircuitState;
  shouldSkip: boolean;
}

interface AttemptLogEntry {
  pluginId: string;
  requestId: string;
  clientType: LlmClientProfile;
  providerName: string;
  model: string | null;
  statusCode: number | null;
  latencyMs: number;
  failureReason: string | null;
}

interface LlmRouterStorage {
  getProviderByName(providerName: string): StoredLlmProvider | null;
  getModelByProviderAndName(providerId: string, modelName: string): StoredLlmModel | null;
  getCircuitState(input: {
    pluginId: string;
    providerName: string;
    now: number;
    openTimeoutMs: number;
  }): CircuitSnapshot;
  markSuccess(input: {
    pluginId: string;
    providerName: string;
    now: number;
    successThreshold: number;
  }): void;
  markFailure(input: {
    pluginId: string;
    providerName: string;
    now: number;
    failureThreshold: number;
    minimumRequests: number;
    errorRateThreshold: number;
  }): void;
  logAttempt(input: AttemptLogEntry): void;
}

export const LlmRouterPlugin: PluginDefinition = {
  name: "llm-router",
  version: "1.0.0",
  priority: 700,
  phases: ["access"],
  configSchema: LlmRouterConfigSchema,
  migrations: [
    {
      id: "0001_init",
      up: `
        CREATE TABLE IF NOT EXISTS plugin_llm_router_circuits (
          plugin_id text NOT NULL,
          provider_name text NOT NULL,
          state text NOT NULL,
          consecutive_failures integer NOT NULL,
          consecutive_successes integer NOT NULL,
          request_count integer NOT NULL,
          failure_count integer NOT NULL,
          opened_at integer,
          created_at text NOT NULL,
          updated_at text NOT NULL,
          PRIMARY KEY(plugin_id, provider_name)
        );
        CREATE INDEX IF NOT EXISTS idx_plugin_llm_router_circuits_state
          ON plugin_llm_router_circuits (state, updated_at);

        CREATE TABLE IF NOT EXISTS plugin_llm_router_request_logs (
          id integer PRIMARY KEY AUTOINCREMENT,
          plugin_id text NOT NULL,
          request_id text NOT NULL,
          client_type text NOT NULL,
          provider_name text NOT NULL,
          model text,
          status_code integer,
          latency_ms integer NOT NULL,
          failure_reason text,
          created_at text NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_plugin_llm_router_request_logs_request_id
          ON plugin_llm_router_request_logs (request_id, created_at);
        CREATE INDEX IF NOT EXISTS idx_plugin_llm_router_request_logs_provider
          ON plugin_llm_router_request_logs (provider_name, created_at);
      `,
    },
  ],
  createStorage: (ctx) => createLlmRouterStorage(ctx.rawDb),

  onAccess: async (ctx: PluginContext): Promise<PluginHandlerResult> => {
    const config = normalizeConfig(ctx.config);
    const storage = getStorage(ctx);
    const baseRequest = cloneRequestState(ctx.request);
    const sharedNormalizedRequest = getNormalizedLlmRequest(ctx.shared);
    const clientProfile = resolveClientProfile(ctx, config, sharedNormalizedRequest);
    const normalizedRequest = resolveNormalizedRequest(
      baseRequest,
      clientProfile,
      sharedNormalizedRequest,
    );
    setNormalizedLlmRequest(ctx.shared, normalizedRequest);

    const parsedModelReference = parseLlmModelReference(normalizedRequest.model);
    if ("error" in parsedModelReference) {
      return badRequest(parsedModelReference.error);
    }

    const provider = storage.getProviderByName(parsedModelReference.providerName);
    if (!provider) {
      return badRequest(`Unknown LLM provider "${parsedModelReference.providerName}"`);
    }
    if (!provider.enabled) {
      return unavailable(`LLM provider "${provider.name}" is disabled`);
    }

    const model = storage.getModelByProviderAndName(provider.id, parsedModelReference.modelName);
    if (!model) {
      return badRequest(
        `Unknown LLM model "${parsedModelReference.modelName}" for provider "${provider.name}"`,
      );
    }
    if (!model.enabled) {
      return unavailable(
        `LLM model "${parsedModelReference.modelName}" for provider "${provider.name}" is disabled`,
      );
    }

    const adapter = getProviderAdapter(provider.vendor);
    const maxAttempts = Math.max(1, config.maxRetries + 1);
    let lastFailureReason = "No available provider response";

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      const now = Date.now();
      const circuit = storage.getCircuitState({
        pluginId: ctx.plugin.id,
        providerName: provider.name,
        now,
        openTimeoutMs: config.circuitBreaker.openTimeoutMs,
      });

      if (circuit.shouldSkip) {
        persistAttemptLog(storage, config, {
          pluginId: ctx.plugin.id,
          requestId: ctx.requestId,
          clientType: clientProfile,
          providerName: provider.name,
          model: normalizedRequest.model,
          statusCode: null,
          latencyMs: 0,
          failureReason: "circuit-open",
        });
        return unavailable(`LLM provider "${provider.name}" circuit is open`);
      }

      const builtAttempt = adapter.buildRequest({
        provider,
        model,
        normalizedRequest,
        baseRequest,
      });
      if ("error" in builtAttempt) {
        return badRequest(builtAttempt.error);
      }

      const request = cloneRequestState(builtAttempt.request);
      request.url = buildProviderUrl(provider.baseUrl, request.url.pathname, request.url.search);
      request.headers.delete("host");
      request.headers.delete("content-length");
      scrubAuthHeaders(request.headers);

      const resolvedAuth = resolveProviderAuth(provider);
      if (resolvedAuth) {
        if ("error" in resolvedAuth) {
          return unavailable(resolvedAuth.error);
        }

        request.headers.set(resolvedAuth.name, resolvedAuth.value);
      }

      for (const [key, value] of Object.entries(provider.headers)) {
        request.headers.set(key, value);
      }

      ctx.request = cloneRequestState(request);
      ctx.shared.set("llm-router.client", clientProfile);
      ctx.shared.set("llm-router.provider", provider.name);
      ctx.shared.set("llm-router.vendor", provider.vendor);
      ctx.shared.set("llm-router.model", parsedModelReference.modelName);
      ctx.shared.set("llm-router.upstream-model", builtAttempt.upstreamModel);

      const startedAt = Date.now();
      ctx.upstreamStartedAt = startedAt;

      try {
        const upstreamResponse = await fetch(toFetchRequest(request), {
          signal: AbortSignal.timeout(config.requestTimeoutMs),
        });
        const completedAt = Date.now();
        const latencyMs = completedAt - startedAt;
        ctx.upstreamCompletedAt = completedAt;

        if (config.retryOnStatus.includes(upstreamResponse.status) && attempt < maxAttempts) {
          storage.markFailure({
            pluginId: ctx.plugin.id,
            providerName: provider.name,
            now: completedAt,
            failureThreshold: config.circuitBreaker.failureThreshold,
            minimumRequests: config.circuitBreaker.minimumRequests,
            errorRateThreshold: config.circuitBreaker.errorRateThreshold,
          });
          lastFailureReason = `Provider "${provider.name}" returned retryable status ${upstreamResponse.status}`;
          persistAttemptLog(storage, config, {
            pluginId: ctx.plugin.id,
            requestId: ctx.requestId,
            clientType: clientProfile,
            providerName: provider.name,
            model: builtAttempt.upstreamModel,
            statusCode: upstreamResponse.status,
            latencyMs,
            failureReason: lastFailureReason,
          });
          continue;
        }

        if (config.retryOnStatus.includes(upstreamResponse.status)) {
          storage.markFailure({
            pluginId: ctx.plugin.id,
            providerName: provider.name,
            now: completedAt,
            failureThreshold: config.circuitBreaker.failureThreshold,
            minimumRequests: config.circuitBreaker.minimumRequests,
            errorRateThreshold: config.circuitBreaker.errorRateThreshold,
          });
        } else {
          storage.markSuccess({
            pluginId: ctx.plugin.id,
            providerName: provider.name,
            now: completedAt,
            successThreshold: config.circuitBreaker.successThreshold,
          });
        }

        const response = await adapter.transformResponse({
          provider,
          normalizedRequest,
          response: upstreamResponse,
        });

        persistAttemptLog(storage, config, {
          pluginId: ctx.plugin.id,
          requestId: ctx.requestId,
          clientType: clientProfile,
          providerName: provider.name,
          model: builtAttempt.upstreamModel,
          statusCode: response.status,
          latencyMs,
          failureReason:
            response.status >= 400 && response.status !== upstreamResponse.status
              ? `Adapter response status ${response.status}`
              : null,
        });

        return {
          stop: true,
          response,
        };
      } catch (error) {
        const completedAt = Date.now();
        const latencyMs = completedAt - startedAt;
        ctx.upstreamCompletedAt = completedAt;

        storage.markFailure({
          pluginId: ctx.plugin.id,
          providerName: provider.name,
          now: completedAt,
          failureThreshold: config.circuitBreaker.failureThreshold,
          minimumRequests: config.circuitBreaker.minimumRequests,
          errorRateThreshold: config.circuitBreaker.errorRateThreshold,
        });

        lastFailureReason = getErrorMessage(error);
        persistAttemptLog(storage, config, {
          pluginId: ctx.plugin.id,
          requestId: ctx.requestId,
          clientType: clientProfile,
          providerName: provider.name,
          model: builtAttempt.upstreamModel,
          statusCode: null,
          latencyMs,
          failureReason: lastFailureReason,
        });
      }
    }

    return unavailable(lastFailureReason, 502);
  },
};

export function createLlmRouterStorage(rawDb: Database.Database): LlmRouterStorage {
  const selectProviderStmt = rawDb.prepare<
    [string],
    {
      id: string;
      name: string;
      display_name: string | null;
      vendor: LlmProviderVendor;
      enabled: number | null;
      protocol: LlmProviderProtocol;
      base_url: string;
      clients: string | null;
      headers: string | null;
      auth: string | null;
      adapter_config: string | null;
    }
  >(
    `SELECT
       id,
       name,
       display_name,
       vendor,
       enabled,
       protocol,
       base_url,
       clients,
       headers,
       auth,
       adapter_config
     FROM llm_providers
     WHERE name = ?`,
  );
  const selectModelStmt = rawDb.prepare<
    [string, string],
    {
      id: string;
      provider_id: string;
      name: string;
      upstream_model: string;
      enabled: number | null;
      metadata: string | null;
    }
  >(
    `SELECT
       id,
       provider_id,
       name,
       upstream_model,
       enabled,
       metadata
     FROM llm_models
     WHERE provider_id = ?
       AND name = ?`,
  );
  const selectCircuitStmt = rawDb.prepare<
    [string, string],
    {
      state: CircuitState;
      consecutive_failures: number;
      consecutive_successes: number;
      request_count: number;
      failure_count: number;
      opened_at: number | null;
    }
  >(
    `SELECT
       state,
       consecutive_failures,
       consecutive_successes,
       request_count,
       failure_count,
       opened_at
     FROM plugin_llm_router_circuits
     WHERE plugin_id = ?
       AND provider_name = ?`,
  );
  const upsertCircuitStmt = rawDb.prepare<
    [string, string, CircuitState, number, number, number, number, number | null, string, string]
  >(
    `INSERT INTO plugin_llm_router_circuits (
       plugin_id,
       provider_name,
       state,
       consecutive_failures,
       consecutive_successes,
       request_count,
       failure_count,
       opened_at,
       created_at,
       updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(plugin_id, provider_name) DO UPDATE SET
       state = excluded.state,
       consecutive_failures = excluded.consecutive_failures,
       consecutive_successes = excluded.consecutive_successes,
       request_count = excluded.request_count,
       failure_count = excluded.failure_count,
       opened_at = excluded.opened_at,
       updated_at = excluded.updated_at`,
  );
  const insertLogStmt = rawDb.prepare<
    [string, string, string, string, string | null, number | null, number, string | null, string]
  >(
    `INSERT INTO plugin_llm_router_request_logs (
       plugin_id,
       request_id,
       client_type,
       provider_name,
       model,
       status_code,
       latency_ms,
       failure_reason,
       created_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );

  const getCircuitState = rawDb.transaction(
    (
      pluginId: string,
      providerName: string,
      now: number,
      openTimeoutMs: number,
    ): CircuitSnapshot => {
      const existing = selectCircuitStmt.get(pluginId, providerName);
      if (!existing) {
        return {
          state: "closed",
          shouldSkip: false,
        };
      }

      if (
        existing.state === "open" &&
        existing.opened_at !== null &&
        now - existing.opened_at >= openTimeoutMs
      ) {
        const timestamp = new Date(now).toISOString();
        upsertCircuitStmt.run(
          pluginId,
          providerName,
          "half-open",
          existing.consecutive_failures,
          0,
          existing.request_count,
          existing.failure_count,
          existing.opened_at,
          timestamp,
          timestamp,
        );
        return {
          state: "half-open",
          shouldSkip: false,
        };
      }

      return {
        state: existing.state,
        shouldSkip: existing.state === "open",
      };
    },
  );

  const markSuccess = rawDb.transaction(
    (pluginId: string, providerName: string, now: number, successThreshold: number): void => {
      const existing = selectCircuitStmt.get(pluginId, providerName);
      const requestCount = (existing?.request_count ?? 0) + 1;
      const failureCount = existing?.failure_count ?? 0;
      const wasHalfOpen = existing?.state === "half-open";
      const consecutiveSuccesses = wasHalfOpen ? (existing?.consecutive_successes ?? 0) + 1 : 0;
      const nextState =
        wasHalfOpen && consecutiveSuccesses < successThreshold ? "half-open" : "closed";
      const timestamp = new Date(now).toISOString();

      upsertCircuitStmt.run(
        pluginId,
        providerName,
        nextState,
        0,
        nextState === "half-open" ? consecutiveSuccesses : 0,
        requestCount,
        failureCount,
        null,
        timestamp,
        timestamp,
      );
    },
  );

  const markFailure = rawDb.transaction(
    (
      pluginId: string,
      providerName: string,
      now: number,
      failureThreshold: number,
      minimumRequests: number,
      errorRateThreshold: number,
    ): void => {
      const existing = selectCircuitStmt.get(pluginId, providerName);
      const requestCount = (existing?.request_count ?? 0) + 1;
      const failureCount = (existing?.failure_count ?? 0) + 1;
      const consecutiveFailures = (existing?.consecutive_failures ?? 0) + 1;
      const errorRate = requestCount > 0 ? failureCount / requestCount : 0;
      const shouldOpen =
        existing?.state === "half-open" ||
        consecutiveFailures >= failureThreshold ||
        (requestCount >= minimumRequests && errorRate >= errorRateThreshold);
      const nextState: CircuitState = shouldOpen ? "open" : "closed";
      const timestamp = new Date(now).toISOString();

      upsertCircuitStmt.run(
        pluginId,
        providerName,
        nextState,
        consecutiveFailures,
        0,
        requestCount,
        failureCount,
        nextState === "open" ? now : null,
        timestamp,
        timestamp,
      );
    },
  );

  return {
    getProviderByName(providerName) {
      const row = selectProviderStmt.get(providerName);
      if (!row) {
        return null;
      }

      return {
        id: row.id,
        ...LlmProviderResourceSchema.parse({
          name: row.name,
          displayName: row.display_name ?? row.name,
          vendor: row.vendor ?? "custom",
          enabled: row.enabled === null ? true : row.enabled === 1,
          protocol: row.protocol,
          baseUrl: row.base_url,
          clients: parseJsonValue(row.clients, undefined),
          headers: parseJsonValue(row.headers, {}),
          auth: parseJsonValue(row.auth, { type: "none" }),
          adapterConfig: parseJsonValue(row.adapter_config, {}),
        }),
      };
    },
    getModelByProviderAndName(providerId, modelName) {
      const row = selectModelStmt.get(providerId, modelName);
      if (!row) {
        return null;
      }

      return {
        id: row.id,
        ...LlmModelResourceSchema.parse({
          providerId: row.provider_id,
          name: row.name,
          upstreamModel: row.upstream_model,
          enabled: row.enabled === null ? true : row.enabled === 1,
          metadata: parseJsonValue(row.metadata, {}),
        }),
      };
    },
    getCircuitState(input) {
      return getCircuitState(input.pluginId, input.providerName, input.now, input.openTimeoutMs);
    },
    markSuccess(input) {
      markSuccess(input.pluginId, input.providerName, input.now, input.successThreshold);
    },
    markFailure(input) {
      markFailure(
        input.pluginId,
        input.providerName,
        input.now,
        input.failureThreshold,
        input.minimumRequests,
        input.errorRateThreshold,
      );
    },
    logAttempt(input) {
      insertLogStmt.run(
        input.pluginId,
        input.requestId,
        input.clientType,
        input.providerName,
        input.model,
        input.statusCode,
        input.latencyMs,
        input.failureReason,
        new Date().toISOString(),
      );
    },
  };
}

function normalizeConfig(config: Record<string, unknown>): LlmRouterConfig {
  return LlmRouterConfigSchema.parse(config);
}

function resolveClientProfile(
  ctx: PluginContext,
  config: LlmRouterConfig,
  normalizedRequest?: NormalizedLlmRequest | null,
): LlmClientProfile {
  if (config.clientProfile !== "auto") {
    return config.clientProfile;
  }

  for (const rule of config.clientRules) {
    if (matchesClientRule(ctx.clientRequest, rule)) {
      return rule.client;
    }
  }

  if (normalizedRequest) {
    return normalizedRequest.clientProfile;
  }

  const pathname = ctx.clientRequest.url.pathname;
  if (pathname.startsWith("/v1/responses")) {
    return "codex";
  }
  if (pathname.startsWith("/v1/messages")) {
    return "claude";
  }
  if (pathname.startsWith("/v1/chat/completions")) {
    return "openai-compatible";
  }
  if (pathname.startsWith("/v1beta") || pathname.includes("/models/")) {
    return "gemini";
  }

  return "unknown";
}

function resolveNormalizedRequest(
  request: HttpRequestState,
  clientProfile: LlmClientProfile,
  normalizedRequest?: NormalizedLlmRequest | null,
): NormalizedLlmRequest {
  const freshNormalizedRequest = normalizeLlmRequest(request, clientProfile);
  if (!normalizedRequest) {
    return freshNormalizedRequest;
  }

  return {
    ...freshNormalizedRequest,
    protocol: normalizedRequest.protocol,
    clientProfile,
  };
}

function matchesClientRule(
  request: PluginContext["clientRequest"],
  rule: LlmRouterConfig["clientRules"][number],
): boolean {
  const { match } = rule;
  if (match.pathPrefix && !request.url.pathname.startsWith(match.pathPrefix)) {
    return false;
  }

  if (match.method && request.method.toUpperCase() !== match.method.toUpperCase()) {
    return false;
  }

  if (match.header) {
    const headerValue = request.headers.get(match.header.name);
    if (!headerValue) {
      return false;
    }
    if (match.header.value && headerValue !== match.header.value) {
      return false;
    }
  }

  return true;
}

function buildProviderUrl(baseUrl: string, pathname: string, search: string): URL {
  const upstreamUrl = new URL(baseUrl);
  const normalizedBasePath = normalizePath(upstreamUrl.pathname);
  const normalizedRequestPath = normalizePath(pathname);

  if (normalizedBasePath === "/") {
    upstreamUrl.pathname = normalizedRequestPath;
  } else if (
    normalizedRequestPath === normalizedBasePath ||
    normalizedRequestPath.startsWith(`${normalizedBasePath}/`)
  ) {
    upstreamUrl.pathname = normalizedRequestPath;
  } else if (normalizedRequestPath === "/v1" || normalizedRequestPath.startsWith("/v1/")) {
    upstreamUrl.pathname = normalizedRequestPath.replace(/^\/v1(?=\/|$)/, normalizedBasePath);
  } else {
    upstreamUrl.pathname = joinPaths(normalizedBasePath, normalizedRequestPath);
  }

  upstreamUrl.search = search;
  upstreamUrl.hash = "";
  return upstreamUrl;
}

function resolveProviderAuth(
  provider: StoredLlmProvider,
): { name: string; value: string } | { error: string } | null {
  const auth = provider.auth;
  switch (auth.type) {
    case "none":
      return null;
    case "bearer": {
      const token = auth.token ?? (auth.tokenEnv ? process.env[auth.tokenEnv] : undefined);
      if (!token) {
        return {
          error: `Provider "${provider.name}" is missing bearer token value`,
        };
      }

      return {
        name: auth.headerName ?? "authorization",
        value: `Bearer ${token}`,
      };
    }
    case "api-key": {
      const key = auth.key ?? (auth.keyEnv ? process.env[auth.keyEnv] : undefined);
      if (!key) {
        return {
          error: `Provider "${provider.name}" is missing API key value`,
        };
      }

      return {
        name: auth.headerName ?? "x-api-key",
        value: key,
      };
    }
    default:
      return null;
  }
}

function scrubAuthHeaders(headers: Headers): void {
  headers.delete("authorization");
  headers.delete("x-api-key");
  headers.delete("api-key");
}

function normalizePath(pathname: string): string {
  if (!pathname || pathname === "/") {
    return "/";
  }

  return pathname.startsWith("/") ? pathname.replace(/\/+$/, "") || "/" : `/${pathname}`;
}

function joinPaths(left: string, right: string): string {
  if (left === "/") {
    return normalizePath(right);
  }

  const normalizedRight = normalizePath(right);
  if (normalizedRight === "/") {
    return left;
  }

  return `${left.replace(/\/+$/, "")}/${normalizedRight.replace(/^\/+/, "")}`;
}

function cloneRequestState(state: HttpRequestState): HttpRequestState {
  return {
    method: state.method,
    url: new URL(state.url.toString()),
    headers: new Headers(state.headers),
    body: state.body ? cloneArrayBuffer(state.body) : null,
  };
}

function getStorage(ctx: PluginContext): LlmRouterStorage {
  if (!ctx.pluginStorage) {
    throw new Error("llm-router storage is not initialized");
  }

  return ctx.pluginStorage as LlmRouterStorage;
}

function persistAttemptLog(
  storage: LlmRouterStorage,
  config: LlmRouterConfig,
  entry: AttemptLogEntry,
): void {
  if (!config.logging.enabled) {
    return;
  }

  storage.logAttempt(entry);
}

function badRequest(message: string): PluginHandlerResult {
  return {
    stop: true,
    response: new Response(
      JSON.stringify({
        error: "Bad Request",
        message,
      }),
      {
        status: 400,
        headers: {
          "content-type": "application/json",
        },
      },
    ),
  };
}

function unavailable(message: string, status = 503): PluginHandlerResult {
  return {
    stop: true,
    response: new Response(
      JSON.stringify({
        error: "Provider Unavailable",
        message,
      }),
      {
        status,
        headers: {
          "content-type": "application/json",
        },
      },
    ),
  };
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    if (error.name === "TimeoutError" || error.name === "AbortError") {
      return "Request timed out";
    }
    return error.message;
  }

  return String(error);
}

function parseJsonValue<T>(value: string | null, fallback: T): T {
  if (value === null) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
