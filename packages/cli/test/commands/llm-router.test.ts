import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { createLlmRouterCommand } from "../../src/commands/llm-router.js";
import { HttpClient } from "../../src/lib/http-client.js";

vi.mock("../../src/lib/http-client.js");

describe("llm-router command", () => {
  const mockGet = vi.fn();
  const mockPost = vi.fn();
  const mockPut = vi.fn();
  const mockDelete = vi.fn();

  beforeEach(() => {
    vi.mocked(HttpClient.create).mockResolvedValue({
      get: mockGet,
      post: mockPost,
      put: mockPut,
      delete: mockDelete,
    } as unknown as HttpClient);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  function createTestCommand(): ReturnType<typeof createLlmRouterCommand> {
    const cmd = createLlmRouterCommand();
    cmd.exitOverride(() => {});
    cmd.configureOutput({
      writeErr: () => {},
    });
    return cmd;
  }

  function parseAdminPath(path: string): URL {
    return new URL(path, "http://admin.test");
  }

  function getBodies(path: string): Record<string, unknown>[] {
    return mockPost.mock.calls
      .filter(([calledPath]) => calledPath === path)
      .map(([, body]) => body as Record<string, unknown>);
  }

  it("initializes the managed LLM router resources", async () => {
    mockGet.mockImplementation(async (path: string) => {
      const url = parseAdminPath(path);
      switch (url.pathname) {
        case "/services":
        case "/routes":
        case "/plugins":
        case "/llm-providers":
        case "/llm-models":
          return [];
        default:
          throw new Error(`Unexpected GET ${path}`);
      }
    });

    mockPost.mockImplementation(async (path: string, body: Record<string, unknown>) => {
      switch (path) {
        case "/services":
          return {
            id: `service:${body.name as string}`,
            name: body.name,
          };
        case "/routes":
          return {
            id: `route:${body.name as string}`,
            name: body.name,
            serviceId: body.serviceId ?? null,
          };
        case "/plugins":
          return {
            id: `plugin:${body.name as string}:${String(body.routeId ?? body.serviceId ?? "global")}`,
            name: body.name,
            serviceId: body.serviceId ?? null,
            routeId: body.routeId ?? null,
          };
        case "/llm-providers":
          return {
            id: `provider:${body.name as string}`,
            name: body.name,
          };
        case "/llm-models":
          return {
            id: `model:${body.providerId as string}:${body.name as string}`,
            providerId: body.providerId,
            name: body.name,
          };
        default:
          throw new Error(`Unexpected POST ${path}`);
      }
    });

    const command = createTestCommand();
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await command.parseAsync(["node", "llm-router", "init", "--providers", "openai,anthropic"]);

    expect(mockPost).toHaveBeenCalledWith("/services", {
      name: "llm-router-service",
      url: "http://llm-router.invalid",
      tags: ["managed", "llm-router"],
    });

    expect(getBodies("/routes")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "llm-openai-responses",
          serviceId: "service:llm-router-service",
          methods: ["POST"],
          paths: ["/v1/responses"],
        }),
        expect.objectContaining({
          name: "llm-openai-chat",
          serviceId: "service:llm-router-service",
          methods: ["POST"],
          paths: ["/v1/chat/completions"],
        }),
        expect.objectContaining({
          name: "llm-anthropic",
          serviceId: "service:llm-router-service",
          methods: ["POST"],
          paths: ["/v1/messages"],
        }),
      ]),
    );

    expect(getBodies("/plugins")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "llm-inbound-openai",
          routeId: "route:llm-openai-responses",
          config: {},
          enabled: true,
        }),
        expect.objectContaining({
          name: "llm-inbound-openai",
          routeId: "route:llm-openai-chat",
          config: {},
          enabled: true,
        }),
        expect.objectContaining({
          name: "llm-inbound-anthropic",
          routeId: "route:llm-anthropic",
          config: {},
          enabled: true,
        }),
        expect.objectContaining({
          name: "llm-router",
          serviceId: "service:llm-router-service",
          config: {},
          enabled: true,
        }),
      ]),
    );

    expect(getBodies("/llm-providers")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "openai",
          displayName: "OpenAI",
          vendor: "openai",
          protocol: "openai-responses",
          baseUrl: "https://api.openai.com/v1",
          auth: {
            type: "bearer",
            tokenEnv: "OPENAI_API_KEY",
          },
          adapterConfig: {},
          enabled: true,
        }),
        expect.objectContaining({
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
          enabled: true,
        }),
      ]),
    );

    expect(getBodies("/llm-models")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          providerId: "provider:openai",
          name: "gpt-4.1",
          upstreamModel: "gpt-4.1",
          enabled: true,
        }),
        expect.objectContaining({
          providerId: "provider:openai",
          name: "gpt-4.1-mini",
          upstreamModel: "gpt-4.1-mini",
          enabled: true,
        }),
        expect.objectContaining({
          providerId: "provider:anthropic",
          name: "claude-sonnet-4-5",
          upstreamModel: "claude-sonnet-4-5",
          enabled: true,
        }),
      ]),
    );

    const summary = JSON.parse(String(logSpy.mock.calls.at(-1)?.[0] ?? "{}")) as Record<
      string,
      unknown
    >;
    expect(summary).toMatchObject({
      service: "llm-router-service",
      routes: ["llm-openai-responses", "llm-openai-chat", "llm-anthropic"],
    });
    expect(summary.providers).toEqual(
      expect.arrayContaining([
        {
          provider: "openai",
          models: ["gpt-4.1", "gpt-4.1-mini"],
        },
        {
          provider: "anthropic",
          models: ["claude-sonnet-4-5"],
        },
      ]),
    );
  });

  it("updates existing managed resources instead of recreating them", async () => {
    const existingService = {
      id: "service-1",
      name: "llm-router-service",
    };
    const existingRoutes = {
      responses: {
        id: "route-responses",
        name: "llm-openai-responses",
        serviceId: "service-1",
      },
      chat: {
        id: "route-chat",
        name: "llm-openai-chat",
        serviceId: "service-1",
      },
      anthropic: {
        id: "route-anthropic",
        name: "llm-anthropic",
        serviceId: "service-1",
      },
    };
    const existingPlugins = {
      responses: {
        id: "plugin-openai-responses",
        name: "llm-inbound-openai",
        routeId: "route-responses",
        serviceId: null,
      },
      chat: {
        id: "plugin-openai-chat",
        name: "llm-inbound-openai",
        routeId: "route-chat",
        serviceId: null,
      },
      anthropic: {
        id: "plugin-anthropic",
        name: "llm-inbound-anthropic",
        routeId: "route-anthropic",
        serviceId: null,
      },
      router: {
        id: "plugin-router",
        name: "llm-router",
        routeId: null,
        serviceId: "service-1",
      },
    };
    const existingProvider = {
      id: "provider-openai",
      name: "openai",
    };
    const existingModels = {
      primary: {
        id: "model-openai-gpt-4.1",
        providerId: "provider-openai",
        name: "gpt-4.1",
      },
      secondary: {
        id: "model-openai-gpt-4.1-mini",
        providerId: "provider-openai",
        name: "gpt-4.1-mini",
      },
    };

    mockGet.mockImplementation(async (path: string) => {
      const url = parseAdminPath(path);
      const name = url.searchParams.get("name");
      const routeId = url.searchParams.get("routeId");
      const serviceId = url.searchParams.get("serviceId");
      const providerId = url.searchParams.get("providerId");

      switch (url.pathname) {
        case "/services":
          return name === existingService.name ? [existingService] : [];
        case "/routes":
          if (name === existingRoutes.responses.name) {
            return [existingRoutes.responses];
          }
          if (name === existingRoutes.chat.name) {
            return [existingRoutes.chat];
          }
          if (name === existingRoutes.anthropic.name) {
            return [existingRoutes.anthropic];
          }
          return [];
        case "/plugins":
          if (name === "llm-inbound-openai" && routeId === existingRoutes.responses.id) {
            return [existingPlugins.responses];
          }
          if (name === "llm-inbound-openai" && routeId === existingRoutes.chat.id) {
            return [existingPlugins.chat];
          }
          if (name === "llm-inbound-anthropic" && routeId === existingRoutes.anthropic.id) {
            return [existingPlugins.anthropic];
          }
          if (name === "llm-router" && serviceId === existingService.id) {
            return [existingPlugins.router];
          }
          return [];
        case "/llm-providers":
          return name === existingProvider.name ? [existingProvider] : [];
        case "/llm-models":
          if (providerId !== existingProvider.id) {
            return [];
          }
          if (name === existingModels.primary.name) {
            return [existingModels.primary];
          }
          if (name === existingModels.secondary.name) {
            return [existingModels.secondary];
          }
          return [];
        default:
          throw new Error(`Unexpected GET ${path}`);
      }
    });

    mockPut.mockImplementation(async (path: string, body: Record<string, unknown>) => {
      if (path === `/services/${existingService.id}`) {
        return {
          id: existingService.id,
          name: body.name,
        };
      }

      if (path === `/routes/${existingRoutes.responses.id}`) {
        return {
          id: existingRoutes.responses.id,
          name: body.name,
          serviceId: body.serviceId ?? null,
        };
      }
      if (path === `/routes/${existingRoutes.chat.id}`) {
        return {
          id: existingRoutes.chat.id,
          name: body.name,
          serviceId: body.serviceId ?? null,
        };
      }
      if (path === `/routes/${existingRoutes.anthropic.id}`) {
        return {
          id: existingRoutes.anthropic.id,
          name: body.name,
          serviceId: body.serviceId ?? null,
        };
      }

      if (
        path === `/plugins/${existingPlugins.responses.id}` ||
        path === `/plugins/${existingPlugins.chat.id}` ||
        path === `/plugins/${existingPlugins.anthropic.id}` ||
        path === `/plugins/${existingPlugins.router.id}`
      ) {
        return {
          id: path.split("/").at(-1),
          name: body.name,
          serviceId: body.serviceId ?? null,
          routeId: body.routeId ?? null,
        };
      }

      if (path === `/llm-providers/${existingProvider.id}`) {
        return {
          id: existingProvider.id,
          name: body.name,
        };
      }

      if (
        path === `/llm-models/${existingModels.primary.id}` ||
        path === `/llm-models/${existingModels.secondary.id}`
      ) {
        return {
          id: path.split("/").at(-1),
          providerId: body.providerId,
          name: body.name,
        };
      }

      throw new Error(`Unexpected PUT ${path}`);
    });

    const command = createTestCommand();
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await command.parseAsync(["node", "llm-router", "init", "--providers", "openai"]);

    expect(mockPost).not.toHaveBeenCalled();
    expect(mockPut).toHaveBeenCalledWith(`/services/${existingService.id}`, {
      name: "llm-router-service",
      url: "http://llm-router.invalid",
      tags: ["managed", "llm-router"],
    });
    expect(mockPut).toHaveBeenCalledWith(`/llm-providers/${existingProvider.id}`, {
      name: "openai",
      displayName: "OpenAI",
      vendor: "openai",
      protocol: "openai-responses",
      baseUrl: "https://api.openai.com/v1",
      auth: {
        type: "bearer",
        tokenEnv: "OPENAI_API_KEY",
      },
      adapterConfig: {},
      enabled: true,
      tags: ["managed", "llm-router"],
    });
    expect(mockPut).toHaveBeenCalledWith(`/llm-models/${existingModels.primary.id}`, {
      providerId: existingProvider.id,
      name: "gpt-4.1",
      upstreamModel: "gpt-4.1",
      tags: ["managed", "llm-router"],
      enabled: true,
      metadata: {},
    });
    expect(mockPut).toHaveBeenCalledWith(`/llm-models/${existingModels.secondary.id}`, {
      providerId: existingProvider.id,
      name: "gpt-4.1-mini",
      upstreamModel: "gpt-4.1-mini",
      tags: ["managed", "llm-router"],
      enabled: true,
      metadata: {},
    });

    const summary = JSON.parse(String(logSpy.mock.calls.at(-1)?.[0] ?? "{}")) as Record<
      string,
      unknown
    >;
    expect(summary.providers).toEqual([
      {
        provider: "openai",
        models: ["gpt-4.1", "gpt-4.1-mini"],
      },
    ]);
  });
});
