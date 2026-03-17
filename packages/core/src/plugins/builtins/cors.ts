import type { PluginDefinition, PluginContext, PluginResponse } from "../types.js";

/**
 * CORS Plugin - Handles Cross-Origin Resource Sharing headers
 */
export const CorsPlugin: PluginDefinition = {
  name: "cors",
  version: "1.0.0",
  priority: 100,
  phases: ["request", "response"],

  configSchema: {
    origin: { type: "string", default: "*" },
    methods: { type: "array", default: ["GET", "POST", "PUT", "DELETE", "OPTIONS"] },
    allowedHeaders: { type: "array", default: [] },
    exposedHeaders: { type: "array", default: [] },
    credentials: { type: "boolean", default: false },
    maxAge: { type: "number", default: 86400 },
  },

  onRequest: (ctx: PluginContext): PluginResponse | void => {
    const config = ctx.config as {
      origin?: string | string[];
      methods?: string[];
      allowedHeaders?: string[];
      exposedHeaders?: string[];
      credentials?: boolean;
      maxAge?: number;
    };

    // Handle preflight OPTIONS request
    if (ctx.method === "OPTIONS") {
      const response = new Response(null, {
        status: 204,
        headers: buildCorsHeaders(config, ctx.headers.get("origin")),
      });
      return { response, stop: true };
    }
  },

  onResponse: (ctx: PluginContext): PluginResponse | void => {
    const config = ctx.config as {
      origin?: string | string[];
      methods?: string[];
      allowedHeaders?: string[];
      exposedHeaders?: string[];
      credentials?: boolean;
      maxAge?: number;
    };

    // Add CORS headers to response
    const origin = ctx.headers.get("origin");
    const headers = buildCorsHeaders(config, origin);

    // For response phase, we can't directly modify the response
    // The engine should handle adding headers based on plugin state
    ctx.state.set("cors-headers", headers);
  },
};

function buildCorsHeaders(
  config: {
    origin?: string | string[];
    methods?: string[];
    allowedHeaders?: string[];
    exposedHeaders?: string[];
    credentials?: boolean;
    maxAge?: number;
  },
  requestOrigin?: string | null,
): Headers {
  const headers = new Headers();

  // Handle origin
  if (config.origin) {
    if (Array.isArray(config.origin)) {
      if (!requestOrigin || config.origin.includes(requestOrigin)) {
        headers.set("Access-Control-Allow-Origin", requestOrigin || "*");
      }
    } else if (config.origin === "*") {
      headers.set("Access-Control-Allow-Origin", "*");
    } else {
      headers.set("Access-Control-Allow-Origin", config.origin);
    }
  } else {
    headers.set("Access-Control-Allow-Origin", "*");
  }

  // Methods
  if (config.methods) {
    headers.set("Access-Control-Allow-Methods", config.methods.join(", "));
  }

  // Headers
  if (config.allowedHeaders) {
    headers.set("Access-Control-Allow-Headers", config.allowedHeaders.join(", "));
  }

  // Exposed headers
  if (config.exposedHeaders) {
    headers.set("Access-Control-Expose-Headers", config.exposedHeaders.join(", "));
  }

  // Credentials
  if (config.credentials) {
    headers.set("Access-Control-Allow-Credentials", "true");
  }

  // Max age
  if (config.maxAge) {
    headers.set("Access-Control-Max-Age", String(config.maxAge));
  }

  // Vary header
  headers.set("Vary", "Origin");

  return headers;
}
