import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { createLlmProvidersCommand } from "../../../src/commands/admin/llm-providers.js";
import { HttpClient } from "../../../src/lib/http-client.js";

vi.mock("../../../src/lib/http-client.js");

describe("admin llm-providers", () => {
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

  function createTestCommand(): ReturnType<typeof createLlmProvidersCommand> {
    const cmd = createLlmProvidersCommand();
    cmd.exitOverride(() => {});
    cmd.configureOutput({
      writeErr: () => {},
    });
    return cmd;
  }

  it("lists providers with vendor, protocol, and enabled filters", async () => {
    mockGet.mockResolvedValue([]);
    const command = createTestCommand();
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await command.parseAsync([
      "node",
      "llm-providers",
      "list",
      "-n",
      "open",
      "-v",
      "openai",
      "-p",
      "openai-responses",
      "--enabled",
      "true",
    ]);

    expect(mockGet).toHaveBeenCalledWith(
      "/llm-providers?limit=20&offset=0&name=open&vendor=openai&protocol=openai-responses&enabled=true",
    );
    expect(logSpy).toHaveBeenCalled();
  });

  it("creates a provider with structured auth and adapter config", async () => {
    mockPost.mockResolvedValue({ id: "provider-1", name: "anthropic" });
    const command = createTestCommand();
    vi.spyOn(console, "log").mockImplementation(() => {});

    await command.parseAsync([
      "node",
      "llm-providers",
      "create",
      "-n",
      "anthropic",
      "-v",
      "anthropic",
      "-p",
      "anthropic-messages",
      "-u",
      "https://api.anthropic.com",
      "--display-name",
      "Anthropic",
      "-c",
      "claude",
      "--headers",
      '{"x-provider":"anthropic"}',
      "--auth",
      '{"type":"api-key","keyEnv":"ANTHROPIC_API_KEY","headerName":"x-api-key"}',
      "--adapter-config",
      '{"anthropicVersion":"2023-06-01"}',
      "--enabled",
      "false",
      "-t",
      "managed,llm",
    ]);

    expect(mockPost).toHaveBeenCalledWith("/llm-providers", {
      name: "anthropic",
      displayName: "Anthropic",
      vendor: "anthropic",
      protocol: "anthropic-messages",
      baseUrl: "https://api.anthropic.com",
      clients: ["claude"],
      headers: { "x-provider": "anthropic" },
      auth: {
        type: "api-key",
        keyEnv: "ANTHROPIC_API_KEY",
        headerName: "x-api-key",
      },
      adapterConfig: {
        anthropicVersion: "2023-06-01",
      },
      enabled: false,
      tags: ["managed", "llm"],
    });
  });

  it("updates a provider with partial fields", async () => {
    mockPut.mockResolvedValue({ id: "provider-1", enabled: true });
    const command = createTestCommand();
    vi.spyOn(console, "log").mockImplementation(() => {});

    await command.parseAsync([
      "node",
      "llm-providers",
      "update",
      "-i",
      "provider-1",
      "--display-name",
      "OpenAI Global",
      "--headers",
      '{"x-region":"global"}',
      "--enabled",
      "true",
    ]);

    expect(mockPut).toHaveBeenCalledWith("/llm-providers/provider-1", {
      displayName: "OpenAI Global",
      headers: {
        "x-region": "global",
      },
      enabled: true,
    });
  });

  it("deletes a provider by id", async () => {
    mockDelete.mockResolvedValue({ deleted: true });
    const command = createTestCommand();
    vi.spyOn(console, "log").mockImplementation(() => {});

    await command.parseAsync(["node", "llm-providers", "delete", "-i", "provider-1"]);

    expect(mockDelete).toHaveBeenCalledWith("/llm-providers/provider-1");
  });

  it("rejects invalid JSON auth", async () => {
    const command = createTestCommand();
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(((code?: number) => {
      throw new Error(`exit:${code ?? 0}`);
    }) as never);

    await expect(
      command.parseAsync([
        "node",
        "llm-providers",
        "create",
        "-n",
        "openai",
        "-v",
        "openai",
        "-p",
        "openai-responses",
        "-u",
        "https://api.openai.com/v1",
        "--auth",
        "not-json",
      ]),
    ).rejects.toThrow("exit:1");

    expect(errorSpy).toHaveBeenCalledWith("Invalid JSON for auth");
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
