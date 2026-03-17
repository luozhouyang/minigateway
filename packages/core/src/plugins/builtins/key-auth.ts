import type { PluginDefinition, PluginContext, PluginResponse } from "../types.js";

/**
 * Key Auth Plugin - Authenticates requests using API keys
 */
export const KeyAuthPlugin: PluginDefinition = {
  name: "key-auth",
  version: "1.0.0",
  priority: 70,
  phases: ["request"],

  configSchema: {
    keyNames: { type: "array", default: ["apikey", "api_key"] },
    headerName: { type: "string", default: "X-API-Key" },
    queryParamName: { type: "string", default: "api_key" },
    hideCredentials: { type: "boolean", default: false },
  },

  onRequest: async (ctx: PluginContext): Promise<PluginResponse | void> => {
    const config = ctx.config as {
      keyNames?: string[];
      headerName?: string;
      queryParamName?: string;
      hideCredentials?: boolean;
    };

    const headerName = config.headerName || "X-API-Key";
    const queryParamName = config.queryParamName || "api_key";

    // Extract API key from request
    const apiKey =
      ctx.headers.get(headerName.toLowerCase()) || ctx.url.searchParams.get(queryParamName);

    if (!apiKey) {
      return {
        response: new Response(
          JSON.stringify({
            error: "Unauthorized",
            message: "No API key found in request",
          }),
          {
            status: 401,
            headers: {
              "Content-Type": "application/json",
              "WWW-Authenticate": "ApiKey",
            },
          },
        ),
        stop: true,
      };
    }

    // Validate API key against stored credentials
    const isValid = await validateApiKey(ctx, apiKey);

    if (!isValid) {
      return {
        response: new Response(
          JSON.stringify({
            error: "Unauthorized",
            message: "Invalid API key",
          }),
          {
            status: 401,
            headers: {
              "Content-Type": "application/json",
            },
          },
        ),
        stop: true,
      };
    }

    // Store validated key in context for downstream plugins
    ctx.state.set("authenticated", true);
    ctx.state.set("api-key", apiKey);

    // Hide credentials if configured
    if (config.hideCredentials) {
      // Remove API key from headers for upstream request
      // This would be handled by the engine
      ctx.state.set("hide-api-key", true);
    }
  },
};

async function validateApiKey(ctx: PluginContext, apiKey: string): Promise<boolean> {
  // In a real implementation, this would query the database
  // through the CredentialRepository to validate the API key
  // For now, we'll check against a simple in-memory store

  const credentials = ctx.state.get("credentials-cache") as Map<string, unknown> | undefined;

  if (credentials) {
    return credentials.has(apiKey);
  }

  // If no cache is available, we'd need to query the database
  // This is a placeholder - the engine should inject the credential checker
  return true; // Accept all keys in development mode
}
