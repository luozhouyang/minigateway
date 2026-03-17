import type { PluginDefinition, PluginContext, PluginResponse } from "../types.js";

/**
 * Rate Limit Plugin - Limits request rate per client
 */
export const RateLimitPlugin: PluginDefinition = {
  name: "rate-limit",
  version: "1.0.0",
  priority: 80,
  phases: ["request"],

  configSchema: {
    limit: { type: "number", default: 100 },
    window: { type: "number", default: 60 },
    key: { type: "string", default: "ip" },
    headers: { type: "boolean", default: true },
  },

  onRequest: (ctx: PluginContext): PluginResponse | void => {
    const config = ctx.config as {
      limit: number;
      window: number;
      key?: string;
      headers?: boolean;
    };

    // Get client identifier
    const clientId = getClientId(ctx, config.key || "ip");

    // Get or create rate limit store
    const store = getRateLimitStore();
    const now = Date.now();
    const windowMs = config.window * 1000;

    // Get current count
    const record = store.get(clientId);
    let count = 0;

    if (record) {
      // Reset if window has passed
      if (now - record.timestamp >= windowMs) {
        store.set(clientId, { count: 0, timestamp: now });
      } else {
        count = record.count;
      }
    }

    // Increment count
    count++;
    store.set(clientId, { count, timestamp: now });

    // Add rate limit headers
    if (config.headers !== false) {
      const headers = ctx.state.get("response-headers") as Headers | undefined;
      if (headers) {
        headers.set("X-RateLimit-Limit", String(config.limit));
        headers.set("X-RateLimit-Remaining", String(Math.max(0, config.limit - count)));
        headers.set("X-RateLimit-Reset", String(now + windowMs));
      } else {
        ctx.state.set(
          "response-headers",
          new Headers({
            "X-RateLimit-Limit": String(config.limit),
            "X-RateLimit-Remaining": String(Math.max(0, config.limit - count)),
            "X-RateLimit-Reset": String(now + windowMs),
          }),
        );
      }
    }

    // Check if limit exceeded
    if (count > config.limit) {
      return {
        response: new Response(
          JSON.stringify({
            error: "Too Many Requests",
            message: `Rate limit exceeded. Limit: ${config.limit} requests per ${config.window} seconds.`,
            retryAfter: Math.ceil((now + windowMs - Date.now()) / 1000),
          }),
          {
            status: 429,
            headers: {
              "Content-Type": "application/json",
              "Retry-After": String(Math.ceil((now + windowMs - Date.now()) / 1000)),
            },
          },
        ),
        stop: true,
      };
    }
  },
};

function getClientId(ctx: PluginContext, key: string): string {
  switch (key) {
    case "ip":
      return ctx.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
    case "header":
      return ctx.headers.get("x-api-key") || "unknown";
    case "consumer":
      return ctx.consumer?.id || "anonymous";
    default:
      return "unknown";
  }
}

// In-memory rate limit store
// In production, use Redis or similar for distributed rate limiting
const rateLimitStore = new Map<string, { count: number; timestamp: number }>();

function getRateLimitStore(): Map<string, { count: number; timestamp: number }> {
  return rateLimitStore;
}
