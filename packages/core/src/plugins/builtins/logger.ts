import type { PluginDefinition, PluginContext } from "../types.js";

/**
 * Logger Plugin - Logs request/response information
 */
export const LoggerPlugin: PluginDefinition = {
  name: "logger",
  version: "1.0.0",
  priority: 90,
  phases: ["request", "response"],

  configSchema: {
    level: { type: "string", enum: ["debug", "info", "warn", "error"], default: "info" },
    format: { type: "string", enum: ["json", "text"], default: "json" },
    fields: { type: "array", default: ["method", "url", "status", "duration"] },
  },

  onRequest: (ctx: PluginContext): void => {
    const config = ctx.config as {
      level?: "debug" | "info" | "warn" | "error";
      format?: "json" | "text";
      fields?: string[];
    };

    const startTime = Date.now();
    ctx.state.set("logger-start-time", startTime);

    const level = config.level || "info";
    if (level === "debug") {
      log(ctx, {
        type: "request",
        method: ctx.method,
        url: ctx.url.toString(),
        headers: Object.fromEntries(ctx.headers.entries()),
        timestamp: new Date().toISOString(),
      });
    }
  },

  onResponse: (ctx: PluginContext): void => {
    const config = ctx.config as {
      level?: "debug" | "info" | "warn" | "error";
      format?: "json" | "text";
      fields?: string[];
    };

    const startTime = ctx.state.get("logger-start-time") as number | undefined;
    const duration = startTime ? Date.now() - startTime : 0;

    const level = config.level || "info";
    if (level !== "debug") {
      log(ctx, {
        type: "response",
        method: ctx.method,
        url: ctx.url.toString(),
        duration: `${duration}ms`,
        timestamp: new Date().toISOString(),
      });
    }
  },
};

function log(ctx: PluginContext, data: Record<string, unknown>): void {
  const config = ctx.config as {
    format?: "json" | "text";
  };

  const format = config.format || "json";

  if (format === "json") {
    console.log(JSON.stringify(data));
  } else {
    const parts = Object.entries(data).map(([key, value]) => `${key}=${String(value)}`);
    console.log(parts.join(" "));
  }
}
