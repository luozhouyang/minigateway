import { Command } from "commander";
import { HttpClient } from "../lib/http-client.js";

interface ServiceResource {
  id: string;
  name: string;
}

interface RouteResource {
  id: string;
  name: string;
  serviceId: string | null;
}

interface PluginResource {
  id: string;
  name: string;
  serviceId: string | null;
  routeId: string | null;
}

interface ProviderResource {
  id: string;
  name: string;
}

interface ModelResource {
  id: string;
  providerId: string;
  name: string;
}

interface ProviderPreset {
  name: string;
  displayName: string;
  vendor: "openai" | "anthropic" | "kimi" | "glm" | "deepseek";
  protocol: "openai-compatible" | "openai-responses" | "anthropic-messages";
  baseUrl: string;
  auth: Record<string, unknown>;
  adapterConfig?: Record<string, unknown>;
  models: Array<{
    name: string;
    upstreamModel: string;
  }>;
}

const DEFAULT_TAGS = ["managed", "llm-router"];

const PROVIDER_PRESETS: Record<string, ProviderPreset> = {
  openai: {
    name: "openai",
    displayName: "OpenAI",
    vendor: "openai",
    protocol: "openai-responses",
    baseUrl: "https://api.openai.com/v1",
    auth: {
      type: "bearer",
      tokenEnv: "OPENAI_API_KEY",
    },
    models: [
      { name: "gpt-4.1", upstreamModel: "gpt-4.1" },
      { name: "gpt-4.1-mini", upstreamModel: "gpt-4.1-mini" },
    ],
  },
  anthropic: {
    name: "anthropic",
    displayName: "Anthropic",
    vendor: "anthropic",
    protocol: "anthropic-messages",
    baseUrl: "https://api.anthropic.com",
    auth: {
      type: "api-key",
      keyEnv: "ANTHROPIC_API_KEY",
      headerName: "x-api-key",
    },
    adapterConfig: {
      anthropicVersion: "2023-06-01",
    },
    models: [{ name: "claude-sonnet-4-5", upstreamModel: "claude-sonnet-4-5" }],
  },
  kimi: {
    name: "kimi",
    displayName: "Kimi",
    vendor: "kimi",
    protocol: "openai-compatible",
    baseUrl: "https://api.moonshot.cn/v1",
    auth: {
      type: "bearer",
      tokenEnv: "MOONSHOT_API_KEY",
    },
    models: [{ name: "kimi-k2", upstreamModel: "kimi-k2" }],
  },
  glm: {
    name: "glm",
    displayName: "GLM",
    vendor: "glm",
    protocol: "openai-compatible",
    baseUrl: "https://open.bigmodel.cn/api/paas/v4",
    auth: {
      type: "bearer",
      tokenEnv: "GLM_API_KEY",
    },
    models: [{ name: "glm-4.5", upstreamModel: "glm-4.5" }],
  },
  deepseek: {
    name: "deepseek",
    displayName: "DeepSeek",
    vendor: "deepseek",
    protocol: "openai-compatible",
    baseUrl: "https://api.deepseek.com",
    auth: {
      type: "bearer",
      tokenEnv: "DEEPSEEK_API_KEY",
    },
    models: [
      { name: "deepseek-chat", upstreamModel: "deepseek-chat" },
      { name: "deepseek-reasoner", upstreamModel: "deepseek-reasoner" },
    ],
  },
};

export function createLlmRouterCommand(): Command {
  const llmRouter = new Command("llm-router");
  llmRouter.description("Manage built-in LLM router resources");

  llmRouter
    .command("init")
    .description("Initialize the LLM router resources on the gateway")
    .option(
      "--providers <providers>",
      "Providers to initialize (comma-separated)",
      "openai,anthropic,kimi,glm,deepseek",
    )
    .option("--service-name <name>", "Internal service name", "llm-router-service")
    .option("--responses-route-name <name>", "Responses route name", "llm-openai-responses")
    .option("--chat-route-name <name>", "Chat completions route name", "llm-openai-chat")
    .option("--anthropic-route-name <name>", "Anthropic messages route name", "llm-anthropic")
    .action(async (options) => {
      const client = await HttpClient.create();
      const selectedProviderNames = Array.from(
        new Set(
          options.providers
            .split(",")
            .map((value: string) => value.trim())
            .filter(Boolean),
        ),
      );
      if (selectedProviderNames.length === 0) {
        throw new Error("At least one LLM provider preset must be specified");
      }
      const presets = (selectedProviderNames as Array<keyof typeof PROVIDER_PRESETS>).map(
        (name) => {
          const preset = PROVIDER_PRESETS[name];
          if (!preset) {
            throw new Error(`Unknown LLM provider preset: ${name}`);
          }
          return preset;
        },
      );

      const service = await ensureService(client, {
        name: options.serviceName,
        url: "http://llm-router.invalid",
        tags: DEFAULT_TAGS,
      });

      const responsesRoute = await ensureRoute(client, {
        name: options.responsesRouteName,
        serviceId: service.id,
        protocols: ["http", "https"],
        methods: ["POST"],
        paths: ["/v1/responses"],
        stripPath: false,
        preserveHost: false,
        tags: DEFAULT_TAGS,
      });
      const chatRoute = await ensureRoute(client, {
        name: options.chatRouteName,
        serviceId: service.id,
        protocols: ["http", "https"],
        methods: ["POST"],
        paths: ["/v1/chat/completions"],
        stripPath: false,
        preserveHost: false,
        tags: DEFAULT_TAGS,
      });
      const anthropicRoute = await ensureRoute(client, {
        name: options.anthropicRouteName,
        serviceId: service.id,
        protocols: ["http", "https"],
        methods: ["POST"],
        paths: ["/v1/messages"],
        stripPath: false,
        preserveHost: false,
        tags: DEFAULT_TAGS,
      });

      await ensurePlugin(client, {
        name: "llm-inbound-openai",
        routeId: responsesRoute.id,
        config: {},
        tags: DEFAULT_TAGS,
      });
      await ensurePlugin(client, {
        name: "llm-inbound-openai",
        routeId: chatRoute.id,
        config: {},
        tags: DEFAULT_TAGS,
      });
      await ensurePlugin(client, {
        name: "llm-inbound-anthropic",
        routeId: anthropicRoute.id,
        config: {},
        tags: DEFAULT_TAGS,
      });
      await ensurePlugin(client, {
        name: "llm-router",
        serviceId: service.id,
        config: {},
        tags: DEFAULT_TAGS,
      });

      const initializedProviders: Array<{ provider: string; models: string[] }> = [];
      for (const preset of presets) {
        const provider = await ensureProvider(client, preset);
        const initializedModelNames: string[] = [];

        for (const modelPreset of preset.models) {
          const model = await ensureModel(client, {
            providerId: provider.id,
            name: modelPreset.name,
            upstreamModel: modelPreset.upstreamModel,
            tags: DEFAULT_TAGS,
          });
          initializedModelNames.push(model.name);
        }

        initializedProviders.push({
          provider: provider.name,
          models: initializedModelNames,
        });
      }

      console.log(
        JSON.stringify(
          {
            service: service.name,
            routes: [responsesRoute.name, chatRoute.name, anthropicRoute.name],
            providers: initializedProviders,
          },
          null,
          2,
        ),
      );
    });

  return llmRouter;
}

async function ensureService(
  client: HttpClient,
  body: {
    name: string;
    url: string;
    tags: string[];
  },
): Promise<ServiceResource> {
  const existing = await findByExactName<ServiceResource>(client, "/services", body.name);
  if (existing) {
    return client.put<ServiceResource>(`/services/${existing.id}`, body);
  }

  return client.post<ServiceResource>("/services", body);
}

async function ensureRoute(
  client: HttpClient,
  body: {
    name: string;
    serviceId: string;
    protocols: string[];
    methods: string[];
    paths: string[];
    stripPath: boolean;
    preserveHost: boolean;
    tags: string[];
  },
): Promise<RouteResource> {
  const existing = await findByExactName<RouteResource>(client, "/routes", body.name);
  if (existing) {
    return client.put<RouteResource>(`/routes/${existing.id}`, body);
  }

  return client.post<RouteResource>("/routes", body);
}

async function ensurePlugin(
  client: HttpClient,
  body: {
    name: string;
    serviceId?: string;
    routeId?: string;
    config: Record<string, unknown>;
    tags: string[];
  },
): Promise<PluginResource> {
  const params = new URLSearchParams({
    limit: "20",
    offset: "0",
    name: body.name,
  });
  if (body.serviceId) {
    params.set("serviceId", body.serviceId);
  }
  if (body.routeId) {
    params.set("routeId", body.routeId);
  }

  const existing = await client
    .get<PluginResource[]>(`/plugins?${params}`)
    .then((items) =>
      items.find(
        (item) =>
          item.name === body.name &&
          (item.serviceId ?? null) === (body.serviceId ?? null) &&
          (item.routeId ?? null) === (body.routeId ?? null),
      ),
    );

  const requestBody = {
    ...body,
    enabled: true,
  };
  if (existing) {
    return client.put<PluginResource>(`/plugins/${existing.id}`, requestBody);
  }

  return client.post<PluginResource>("/plugins", requestBody);
}

async function ensureProvider(
  client: HttpClient,
  preset: ProviderPreset,
): Promise<ProviderResource> {
  const existing = await findByExactName<ProviderResource>(client, "/llm-providers", preset.name);
  const body = {
    name: preset.name,
    displayName: preset.displayName,
    vendor: preset.vendor,
    protocol: preset.protocol,
    baseUrl: preset.baseUrl,
    auth: preset.auth,
    adapterConfig: preset.adapterConfig ?? {},
    enabled: true,
    tags: DEFAULT_TAGS,
  };

  if (existing) {
    return client.put<ProviderResource>(`/llm-providers/${existing.id}`, body);
  }

  return client.post<ProviderResource>("/llm-providers", body);
}

async function ensureModel(
  client: HttpClient,
  body: {
    providerId: string;
    name: string;
    upstreamModel: string;
    tags: string[];
  },
): Promise<ModelResource> {
  const params = new URLSearchParams({
    limit: "20",
    offset: "0",
    providerId: body.providerId,
    name: body.name,
  });
  const existing = await client
    .get<ModelResource[]>(`/llm-models?${params}`)
    .then((items) =>
      items.find((item) => item.providerId === body.providerId && item.name === body.name),
    );

  const requestBody = {
    ...body,
    enabled: true,
    metadata: {},
  };
  if (existing) {
    return client.put<ModelResource>(`/llm-models/${existing.id}`, requestBody);
  }

  return client.post<ModelResource>("/llm-models", requestBody);
}

async function findByExactName<T extends { id: string; name: string }>(
  client: HttpClient,
  path: string,
  name: string,
): Promise<T | undefined> {
  const params = new URLSearchParams({
    limit: "20",
    offset: "0",
    name,
  });

  return client
    .get<T[]>(`${path}?${params}`)
    .then((items) => items.find((item) => item.name === name));
}
