import { Command } from "commander";
import { HttpClient } from "../../lib/http-client.js";

export function createLlmModelsCommand(): Command {
  const models = new Command("llm-models");
  models.description("Manage LLM models");

  models
    .command("list")
    .description("List all LLM models")
    .option("-l, --limit <number>", "Limit results", "20")
    .option("-o, --offset <number>", "Offset results", "0")
    .option("-n, --name <name>", "Filter by model name")
    .option("-p, --provider-id <id>", "Filter by provider ID")
    .option("--provider-name <name>", "Filter by provider name")
    .option("--enabled <boolean>", "Filter by enabled state")
    .action(async (options) => {
      const client = await HttpClient.create();
      const params = new URLSearchParams({
        limit: options.limit,
        offset: options.offset,
      });
      if (options.name) params.set("name", options.name);
      if (options.providerId) params.set("providerId", options.providerId);
      if (options.providerName) params.set("providerName", options.providerName);
      if (options.enabled !== undefined) params.set("enabled", options.enabled);

      const response = await client.get(`/llm-models?${params}`);
      console.log(JSON.stringify(response, null, 2));
    });

  models
    .command("get")
    .description("Get an LLM model by ID")
    .argument("<id>", "Model ID")
    .action(async (id) => {
      const client = await HttpClient.create();
      const response = await client.get(`/llm-models/${id}`);
      console.log(JSON.stringify(response, null, 2));
    });

  models
    .command("create")
    .description("Create an LLM model")
    .requiredOption("-p, --provider-id <id>", "Provider ID")
    .requiredOption("-n, --name <name>", "Model name")
    .requiredOption("-u, --upstream-model <name>", "Upstream model name")
    .option("--metadata <json>", "Model metadata (JSON string)")
    .option("--enabled <boolean>", "Enabled", "true")
    .option("-t, --tags <tags>", "Tags (comma-separated)")
    .action(async (options) => {
      const client = await HttpClient.create();
      const body: Record<string, unknown> = {
        providerId: options.providerId,
        name: options.name,
        upstreamModel: options.upstreamModel,
        enabled: options.enabled === "true",
      };

      if (options.metadata) {
        body.metadata = parseJsonOption(options.metadata, "metadata");
      }
      if (options.tags) {
        body.tags = options.tags.split(",").map((value: string) => value.trim());
      }

      const response = await client.post("/llm-models", body);
      console.log(JSON.stringify(response, null, 2));
    });

  models
    .command("update")
    .description("Update an LLM model")
    .requiredOption("-i, --id <id>", "Model ID")
    .option("-p, --provider-id <id>", "Provider ID")
    .option("-n, --name <name>", "Model name")
    .option("-u, --upstream-model <name>", "Upstream model name")
    .option("--metadata <json>", "Model metadata (JSON string)")
    .option("--enabled <boolean>", "Enabled")
    .option("-t, --tags <tags>", "Tags (comma-separated)")
    .action(async (options) => {
      const client = await HttpClient.create();
      const body: Record<string, unknown> = {};

      if (options.providerId) body.providerId = options.providerId;
      if (options.name) body.name = options.name;
      if (options.upstreamModel) body.upstreamModel = options.upstreamModel;
      if (options.metadata) {
        body.metadata = parseJsonOption(options.metadata, "metadata");
      }
      if (options.enabled !== undefined) {
        body.enabled = options.enabled === "true";
      }
      if (options.tags) {
        body.tags = options.tags.split(",").map((value: string) => value.trim());
      }

      const response = await client.put(`/llm-models/${options.id}`, body);
      console.log(JSON.stringify(response, null, 2));
    });

  models
    .command("delete")
    .description("Delete an LLM model")
    .requiredOption("-i, --id <id>", "Model ID")
    .action(async (options) => {
      const client = await HttpClient.create();
      const response = await client.delete(`/llm-models/${options.id}`);
      console.log(JSON.stringify(response, null, 2));
    });

  return models;
}

function parseJsonOption(value: string, field: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    console.error(`Invalid JSON for ${field}`);
    process.exit(1);
  }
}
