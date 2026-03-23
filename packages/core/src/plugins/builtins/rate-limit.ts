import type { PluginContext, PluginDefinition, PluginHandlerResult } from "../types.js";

interface RateLimitConfig {
  limit: number;
  window: number;
  key?: "ip" | "header" | "consumer";
  headers?: boolean;
}

export const RateLimitPlugin: PluginDefinition = {
  name: "rate-limit",
  version: "2.0.0",
  priority: 910,
  phases: ["access", "response"],

  onAccess: (ctx: PluginContext): PluginHandlerResult | void => {
    const config = normalizeConfig(ctx.config as Partial<RateLimitConfig>);
    const clientId = getClientId(ctx, config.key);
    const now = Date.now();
    const windowMs = config.window * 1000;
    const store = getRateLimitStore();

    const current = store.get(clientId);
    const inWindow = current && now - current.timestamp < windowMs;
    const count = (inWindow ? current.count : 0) + 1;
    const resetAt = (inWindow ? current.timestamp : now) + windowMs;

    store.set(clientId, {
      count,
      timestamp: inWindow ? current.timestamp : now,
    });

    const headers = buildRateLimitHeaders(config.limit, count, resetAt);
    ctx.shared.set("rate-limit-headers", headers);

    if (count <= config.limit) {
      return;
    }

    return {
      stop: true,
      response: new Response(
        JSON.stringify({
          error: "Too Many Requests",
          message: `Rate limit exceeded. Limit: ${config.limit} requests per ${config.window} seconds.`,
          retry_after: Math.ceil((resetAt - now) / 1000),
        }),
        {
          status: 429,
          headers: {
            ...Object.fromEntries(headers.entries()),
            "content-type": "application/json",
            "retry-after": String(Math.ceil((resetAt - now) / 1000)),
          },
        },
      ),
    };
  },

  onResponse: (ctx: PluginContext): void => {
    if (!ctx.response) {
      return;
    }

    const config = normalizeConfig(ctx.config as Partial<RateLimitConfig>);
    if (!config.headers) {
      return;
    }

    const headers = ctx.shared.get("rate-limit-headers") as Headers | undefined;
    if (!headers) {
      return;
    }

    headers.forEach((value, key) => {
      ctx.response?.headers.set(key, value);
    });
  },
};

function normalizeConfig(config: Partial<RateLimitConfig>): RateLimitConfig {
  return {
    limit: config.limit ?? 100,
    window: config.window ?? 60,
    key: config.key ?? "ip",
    headers: config.headers !== false,
  };
}

function buildRateLimitHeaders(limit: number, count: number, resetAt: number): Headers {
  return new Headers({
    "x-ratelimit-limit": String(limit),
    "x-ratelimit-remaining": String(Math.max(0, limit - count)),
    "x-ratelimit-reset": String(Math.ceil(resetAt / 1000)),
  });
}

function getClientId(ctx: PluginContext, key: RateLimitConfig["key"]): string {
  switch (key) {
    case "header":
      return ctx.clientRequest.headers.get("x-api-key") || "unknown";
    case "consumer":
      return ctx.consumer?.id || "anonymous";
    case "ip":
    default:
      return ctx.clientRequest.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  }
}

const rateLimitStore = new Map<string, { count: number; timestamp: number }>();

function getRateLimitStore(): Map<string, { count: number; timestamp: number }> {
  return rateLimitStore;
}
