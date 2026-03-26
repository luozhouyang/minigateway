import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { createLlmModelsCommand } from "../../../src/commands/admin/llm-models.js";
import { HttpClient } from "../../../src/lib/http-client.js";

vi.mock("../../../src/lib/http-client.js");

describe("admin llm-models", () => {
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

  function createTestCommand(): ReturnType<typeof createLlmModelsCommand> {
    const cmd = createLlmModelsCommand();
    cmd.exitOverride(() => {});
    cmd.configureOutput({
      writeErr: () => {},
    });
    return cmd;
  }

  it("lists models with provider and enabled filters", async () => {
    mockGet.mockResolvedValue([]);
    const command = createTestCommand();
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await command.parseAsync([
      "node",
      "llm-models",
      "list",
      "-n",
      "gpt",
      "--provider-name",
      "openai",
      "--enabled",
      "false",
    ]);

    expect(mockGet).toHaveBeenCalledWith(
      "/llm-models?limit=20&offset=0&name=gpt&providerName=openai&enabled=false",
    );
    expect(logSpy).toHaveBeenCalled();
  });

  it("creates a model with metadata and tags", async () => {
    mockPost.mockResolvedValue({ id: "model-1", name: "gpt-4.1" });
    const command = createTestCommand();
    vi.spyOn(console, "log").mockImplementation(() => {});

    await command.parseAsync([
      "node",
      "llm-models",
      "create",
      "-p",
      "provider-1",
      "-n",
      "gpt-4.1",
      "-u",
      "gpt-4.1-2026-03-01",
      "--metadata",
      '{"tier":"default","family":"gpt"}',
      "--enabled",
      "true",
      "-t",
      "managed,stable",
    ]);

    expect(mockPost).toHaveBeenCalledWith("/llm-models", {
      providerId: "provider-1",
      name: "gpt-4.1",
      upstreamModel: "gpt-4.1-2026-03-01",
      metadata: {
        tier: "default",
        family: "gpt",
      },
      enabled: true,
      tags: ["managed", "stable"],
    });
  });

  it("updates a model with provider, metadata, and enabled state", async () => {
    mockPut.mockResolvedValue({ id: "model-1", enabled: false });
    const command = createTestCommand();
    vi.spyOn(console, "log").mockImplementation(() => {});

    await command.parseAsync([
      "node",
      "llm-models",
      "update",
      "-i",
      "model-1",
      "-p",
      "provider-2",
      "-u",
      "deepseek-chat",
      "--metadata",
      '{"tier":"fallback"}',
      "--enabled",
      "false",
      "-t",
      "llm-router",
    ]);

    expect(mockPut).toHaveBeenCalledWith("/llm-models/model-1", {
      providerId: "provider-2",
      upstreamModel: "deepseek-chat",
      metadata: {
        tier: "fallback",
      },
      enabled: false,
      tags: ["llm-router"],
    });
  });

  it("deletes a model by id", async () => {
    mockDelete.mockResolvedValue({ deleted: true });
    const command = createTestCommand();
    vi.spyOn(console, "log").mockImplementation(() => {});

    await command.parseAsync(["node", "llm-models", "delete", "-i", "model-1"]);

    expect(mockDelete).toHaveBeenCalledWith("/llm-models/model-1");
  });

  it("rejects invalid JSON metadata", async () => {
    const command = createTestCommand();
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(((code?: number) => {
      throw new Error(`exit:${code ?? 0}`);
    }) as never);

    await expect(
      command.parseAsync([
        "node",
        "llm-models",
        "create",
        "-p",
        "provider-1",
        "-n",
        "gpt-4.1",
        "-u",
        "gpt-4.1",
        "--metadata",
        "not-json",
      ]),
    ).rejects.toThrow("exit:1");

    expect(errorSpy).toHaveBeenCalledWith("Invalid JSON for metadata");
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
