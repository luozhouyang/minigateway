import { Command } from "commander";
import { HttpClient } from "../../lib/http-client.js";

export function createLlmProvidersCommand(): Command {
  const providers = new Command("llm-providers");
  providers.description("Manage LLM providers");

  providers
    .command("list")
    .description("List all LLM providers")
    .option("-l, --limit <number>", "Limit results", "20")
    .option("-o, --offset <number>", "Offset results", "0")
    .option("-n, --name <name>", "Filter by name")
    .option("-v, --vendor <vendor>", "Filter by vendor")
    .option("-p, --protocol <protocol>", "Filter by protocol")
    .option("--enabled <boolean>", "Filter by enabled state")
    .action(async (options) => {
      const client = await HttpClient.create();
      const params = new URLSearchParams({
        limit: options.limit,
        offset: options.offset,
      });
      if (options.name) {
        params.set("name", options.name);
      }
      if (options.vendor) {
        params.set("vendor", options.vendor);
      }
      if (options.protocol) {
        params.set("protocol", options.protocol);
      }
      if (options.enabled !== undefined) {
        params.set("enabled", options.enabled);
      }

      const response = await client.get(`/llm-providers?${params}`);
      console.log(JSON.stringify(response, null, 2));
    });

  providers
    .command("get")
    .description("Get an LLM provider by ID")
    .argument("<id>", "Provider ID")
    .action(async (id) => {
      const client = await HttpClient.create();
      const response = await client.get(`/llm-providers/${id}`);
      console.log(JSON.stringify(response, null, 2));
    });

  providers
    .command("create")
    .description("Create an LLM provider")
    .requiredOption("-n, --name <name>", "Provider name")
    .requiredOption("-v, --vendor <vendor>", "Provider vendor")
    .requiredOption("-p, --protocol <protocol>", "Provider protocol")
    .requiredOption("-u, --base-url <url>", "Provider base URL")
    .option("--display-name <name>", "Provider display name")
    .option("-c, --clients <clients>", "Allowed client profiles (comma-separated)")
    .option("--headers <json>", "Provider headers (JSON string)")
    .option("--auth <json>", "Provider auth config (JSON string)")
    .option("--adapter-config <json>", "Provider adapter config (JSON string)")
    .option("--enabled <boolean>", "Enabled", "true")
    .option("-t, --tags <tags>", "Tags (comma-separated)")
    .action(async (options) => {
      const client = await HttpClient.create();
      const body: Record<string, unknown> = {
        name: options.name,
        vendor: options.vendor,
        protocol: options.protocol,
        baseUrl: options.baseUrl,
        enabled: options.enabled === "true",
      };

      if (options.displayName) {
        body.displayName = options.displayName;
      }
      if (options.clients) {
        body.clients = options.clients.split(",").map((value: string) => value.trim());
      }
      if (options.headers) {
        body.headers = parseJsonOption(options.headers, "headers");
      }
      if (options.auth) {
        body.auth = parseJsonOption(options.auth, "auth");
      }
      if (options.adapterConfig) {
        body.adapterConfig = parseJsonOption(options.adapterConfig, "adapter config");
      }
      if (options.tags) {
        body.tags = options.tags.split(",").map((value: string) => value.trim());
      }

      const response = await client.post("/llm-providers", body);
      console.log(JSON.stringify(response, null, 2));
    });

  providers
    .command("update")
    .description("Update an LLM provider")
    .requiredOption("-i, --id <id>", "Provider ID")
    .option("-n, --name <name>", "Provider name")
    .option("-v, --vendor <vendor>", "Provider vendor")
    .option("-p, --protocol <protocol>", "Provider protocol")
    .option("-u, --base-url <url>", "Provider base URL")
    .option("--display-name <name>", "Provider display name")
    .option("-c, --clients <clients>", "Allowed client profiles (comma-separated)")
    .option("--headers <json>", "Provider headers (JSON string)")
    .option("--auth <json>", "Provider auth config (JSON string)")
    .option("--adapter-config <json>", "Provider adapter config (JSON string)")
    .option("--enabled <boolean>", "Enabled")
    .option("-t, --tags <tags>", "Tags (comma-separated)")
    .action(async (options) => {
      const client = await HttpClient.create();
      const body: Record<string, unknown> = {};

      if (options.name) body.name = options.name;
      if (options.displayName) body.displayName = options.displayName;
      if (options.vendor) body.vendor = options.vendor;
      if (options.protocol) body.protocol = options.protocol;
      if (options.baseUrl) body.baseUrl = options.baseUrl;
      if (options.clients) {
        body.clients = options.clients.split(",").map((value: string) => value.trim());
      }
      if (options.headers) {
        body.headers = parseJsonOption(options.headers, "headers");
      }
      if (options.auth) {
        body.auth = parseJsonOption(options.auth, "auth");
      }
      if (options.adapterConfig) {
        body.adapterConfig = parseJsonOption(options.adapterConfig, "adapter config");
      }
      if (options.enabled !== undefined) {
        body.enabled = options.enabled === "true";
      }
      if (options.tags) {
        body.tags = options.tags.split(",").map((value: string) => value.trim());
      }

      const response = await client.put(`/llm-providers/${options.id}`, body);
      console.log(JSON.stringify(response, null, 2));
    });

  providers
    .command("delete")
    .description("Delete an LLM provider")
    .requiredOption("-i, --id <id>", "Provider ID")
    .action(async (options) => {
      const client = await HttpClient.create();
      const response = await client.delete(`/llm-providers/${options.id}`);
      console.log(JSON.stringify(response, null, 2));
    });

  return providers;
}

function parseJsonOption(value: string, field: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    console.error(`Invalid JSON for ${field}`);
    process.exit(1);
  }
}
