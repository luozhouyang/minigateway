import type { PluginContext, PluginDefinition, PluginHandlerResult } from "../types.js";

interface KeyAuthConfig {
  key_names?: string[];
  keyNames?: string[];
  hide_credentials?: boolean;
  hideCredentials?: boolean;
}

export const KeyAuthPlugin: PluginDefinition = {
  name: "key-auth",
  version: "2.0.0",
  priority: 1250,
  phases: ["access"],

  onAccess: async (ctx: PluginContext): Promise<PluginHandlerResult | void> => {
    const config = normalizeConfig(ctx.config as KeyAuthConfig);
    const credential = findCredential(ctx, config.keyNames);

    if (!credential) {
      return unauthorized("No API key found in request");
    }

    const isValid = await validateApiKey(ctx, credential.name, credential.value);
    if (!isValid) {
      return unauthorized("Invalid API key");
    }

    ctx.shared.set("authenticated", true);
    ctx.shared.set("api-key", credential.value);

    if (config.hideCredentials) {
      ctx.request.headers.delete(credential.name);
      ctx.request.url.searchParams.delete(credential.name);
    }
  },
};

function normalizeConfig(config: KeyAuthConfig) {
  return {
    keyNames: config.key_names ?? config.keyNames ?? ["apikey", "api_key", "x-api-key"],
    hideCredentials: config.hide_credentials ?? config.hideCredentials ?? false,
  };
}

function findCredential(
  ctx: PluginContext,
  keyNames: string[],
): {
  name: string;
  value: string;
} | null {
  for (const keyName of keyNames) {
    const headerValue =
      ctx.clientRequest.headers.get(keyName) ||
      ctx.clientRequest.headers.get(keyName.toLowerCase()) ||
      ctx.clientRequest.headers.get(keyName.toUpperCase());
    if (headerValue) {
      return { name: keyName, value: headerValue };
    }

    const queryValue = ctx.clientRequest.url.searchParams.get(keyName);
    if (queryValue) {
      return { name: keyName, value: queryValue };
    }
  }

  return null;
}

async function validateApiKey(
  ctx: PluginContext,
  keyName: string,
  apiKey: string,
): Promise<boolean> {
  const credentials = ctx.shared.get("credentials-cache") as Map<string, unknown> | undefined;
  if (credentials) {
    return credentials.has(apiKey);
  }

  ctx.shared.set("auth-key-name", keyName);
  return true;
}

function unauthorized(message: string): PluginHandlerResult {
  return {
    stop: true,
    response: new Response(
      JSON.stringify({
        error: "Unauthorized",
        message,
      }),
      {
        status: 401,
        headers: {
          "content-type": "application/json",
          "www-authenticate": "ApiKey",
        },
      },
    ),
  };
}
