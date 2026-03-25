import {
  applyNormalizedModel,
} from "./normalized-request.js";
import type {
  LlmModelResourceConfig,
  LlmProviderResourceConfig,
} from "./config.js";
import type {
  LlmInboundProtocol,
  LlmProviderProtocol,
  LlmProviderVendor,
  NormalizedLlmRequest,
} from "./types.js";
import {
  cloneArrayBuffer,
  isJsonContentType,
  writeJsonObject,
  type HttpRequestState,
} from "../runtime.js";

export interface StoredLlmProvider extends LlmProviderResourceConfig {
  id: string;
}

export interface StoredLlmModel extends LlmModelResourceConfig {
  id: string;
}

export interface AdapterBuildResult {
  request: HttpRequestState;
  upstreamModel: string;
}

export interface LlmProviderAdapter {
  readonly vendor: LlmProviderVendor;
  buildRequest(input: {
    provider: StoredLlmProvider;
    model: StoredLlmModel;
    normalizedRequest: NormalizedLlmRequest;
    baseRequest: HttpRequestState;
  }): AdapterBuildResult | { error: string };
  transformResponse(input: {
    provider: StoredLlmProvider;
    normalizedRequest: NormalizedLlmRequest;
    response: Response;
  }): Promise<Response> | Response;
}

const DEFAULT_ANTHROPIC_VERSION = "2023-06-01";

export function getProviderAdapter(vendor: LlmProviderVendor): LlmProviderAdapter {
  return PROVIDER_ADAPTERS[vendor] ?? PROVIDER_ADAPTERS.custom;
}

const PROVIDER_ADAPTERS: Record<LlmProviderVendor, LlmProviderAdapter> = {
  openai: createDefaultAdapter("openai"),
  anthropic: createDefaultAdapter("anthropic"),
  kimi: createDefaultAdapter("kimi"),
  glm: createDefaultAdapter("glm"),
  deepseek: createDefaultAdapter("deepseek"),
  custom: createDefaultAdapter("custom"),
};

function createDefaultAdapter(vendor: LlmProviderVendor): LlmProviderAdapter {
  return {
    vendor,
    buildRequest(input) {
      return buildRequestWithProtocolTransform(input);
    },
    async transformResponse(input) {
      return transformResponseWithProtocolTransform(input);
    },
  };
}

function buildRequestWithProtocolTransform(input: {
  provider: StoredLlmProvider;
  model: StoredLlmModel;
  normalizedRequest: NormalizedLlmRequest;
  baseRequest: HttpRequestState;
}): AdapterBuildResult | { error: string } {
  const request = cloneRequestState(input.baseRequest);
  const targetProtocol = input.provider.protocol;
  const upstreamModel = input.model.upstreamModel;

  if (targetProtocol === "passthrough" || targetProtocol === input.normalizedRequest.protocol) {
    const rewritten = applyNormalizedModel(request, input.normalizedRequest, upstreamModel);
    applyVendorDefaults(input.provider, request.headers);

    return {
      request,
      upstreamModel: rewritten.model ?? upstreamModel,
    };
  }

  const canonicalRequest = normalizeToCanonicalRequest(input.normalizedRequest, upstreamModel);
  if ("error" in canonicalRequest) {
    return canonicalRequest;
  }

  writeJsonObject(request, serializeCanonicalRequest(canonicalRequest, targetProtocol));
  request.url.pathname = getProtocolPath(targetProtocol);
  request.url.search = input.baseRequest.url.search;
  applyVendorDefaults(input.provider, request.headers);

  return {
    request,
    upstreamModel,
  };
}

async function transformResponseWithProtocolTransform(input: {
  provider: StoredLlmProvider;
  normalizedRequest: NormalizedLlmRequest;
  response: Response;
}): Promise<Response> {
  if (
    input.provider.protocol === "passthrough" ||
    input.provider.protocol === input.normalizedRequest.protocol ||
    input.normalizedRequest.protocol === "unknown" ||
    input.response.status >= 400
  ) {
    return input.response;
  }

  const contentType = input.response.headers.get("content-type");
  if (contentType?.includes("text/event-stream")) {
    return buildGatewayErrorResponse(
      "Streaming protocol transforms are not supported across different LLM protocols",
      501,
    );
  }

  if (!isJsonContentType(contentType)) {
    return input.response;
  }

  const body = (await input.response.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return input.response;
  }

  const normalizedResponse = normalizeToCanonicalResponse(body, input.provider.protocol);
  const transformed = serializeCanonicalResponse(
    normalizedResponse,
    input.normalizedRequest.protocol,
  );
  const headers = new Headers(input.response.headers);
  headers.set("content-type", "application/json");
  headers.delete("content-length");

  return new Response(JSON.stringify(transformed), {
    status: input.response.status,
    statusText: input.response.statusText,
    headers,
  });
}

function applyVendorDefaults(provider: StoredLlmProvider, headers: Headers): void {
  if (provider.vendor === "anthropic") {
    headers.set(
      "anthropic-version",
      getStringValue(provider.adapterConfig.anthropicVersion) ?? DEFAULT_ANTHROPIC_VERSION,
    );
  }
}

interface CanonicalChatRequest {
  model: string;
  system: string | null;
  messages: CanonicalMessage[];
  maxTokens: number | null;
  stream: boolean;
  temperature: number | null;
  topP: number | null;
}

interface CanonicalMessage {
  role: "user" | "assistant";
  content: string;
}

interface CanonicalResponse {
  id: string | null;
  model: string | null;
  text: string;
  finishReason: string | null;
  usage: {
    inputTokens: number | null;
    outputTokens: number | null;
    totalTokens: number | null;
  };
}

function normalizeToCanonicalRequest(
  normalizedRequest: NormalizedLlmRequest,
  upstreamModel: string,
): CanonicalChatRequest | { error: string } {
  switch (normalizedRequest.protocol) {
    case "openai-compatible":
      return normalizeOpenAiChatRequest(normalizedRequest, upstreamModel);
    case "openai-responses":
      return normalizeOpenAiResponsesRequest(normalizedRequest, upstreamModel);
    case "anthropic-messages":
      return normalizeAnthropicRequest(normalizedRequest, upstreamModel);
    default:
      return {
        error: `Unsupported inbound LLM protocol: ${normalizedRequest.protocol}`,
      };
  }
}

function normalizeOpenAiChatRequest(
  normalizedRequest: NormalizedLlmRequest,
  upstreamModel: string,
): CanonicalChatRequest | { error: string } {
  const body = normalizedRequest.jsonBody;
  if (!body) {
    return {
      error: "OpenAI chat requests must include a JSON body",
    };
  }

  const sourceMessages = Array.isArray(body.messages) ? body.messages : [];
  const systemMessages: string[] = [];
  const messages: CanonicalMessage[] = [];

  for (const message of sourceMessages) {
    if (!message || typeof message !== "object") {
      continue;
    }

    const record = message as Record<string, unknown>;
    const role = typeof record.role === "string" ? record.role : "user";
    const content = normalizeContentToText(record.content);
    if (!content) {
      continue;
    }

    if (role === "system") {
      systemMessages.push(content);
      continue;
    }

    if (role === "user" || role === "assistant") {
      messages.push({ role, content });
    }
  }

  return {
    model: upstreamModel,
    system: systemMessages.length > 0 ? systemMessages.join("\n\n") : null,
    messages,
    maxTokens: getNumberValue(body.max_tokens),
    stream: getBooleanValue(body.stream),
    temperature: getNumberValue(body.temperature),
    topP: getNumberValue(body.top_p),
  };
}

function normalizeAnthropicRequest(
  normalizedRequest: NormalizedLlmRequest,
  upstreamModel: string,
): CanonicalChatRequest | { error: string } {
  const body = normalizedRequest.jsonBody;
  if (!body) {
    return {
      error: "Anthropic messages requests must include a JSON body",
    };
  }

  const messages = Array.isArray(body.messages)
    ? body.messages.flatMap((message) => normalizeAnthropicMessage(message))
    : [];

  return {
    model: upstreamModel,
    system: normalizeContentToText(body.system),
    messages,
    maxTokens: getNumberValue(body.max_tokens),
    stream: getBooleanValue(body.stream),
    temperature: getNumberValue(body.temperature),
    topP: getNumberValue(body.top_p),
  };
}

function normalizeOpenAiResponsesRequest(
  normalizedRequest: NormalizedLlmRequest,
  upstreamModel: string,
): CanonicalChatRequest | { error: string } {
  const body = normalizedRequest.jsonBody;
  if (!body) {
    return {
      error: "OpenAI responses requests must include a JSON body",
    };
  }

  const input = body.input;
  const messages = normalizeResponsesInputToMessages(input);

  return {
    model: upstreamModel,
    system: normalizeContentToText(body.instructions),
    messages,
    maxTokens: getNumberValue(body.max_output_tokens),
    stream: getBooleanValue(body.stream),
    temperature: getNumberValue(body.temperature),
    topP: getNumberValue(body.top_p),
  };
}

function normalizeAnthropicMessage(message: unknown): CanonicalMessage[] {
  if (!message || typeof message !== "object") {
    return [];
  }

  const record = message as Record<string, unknown>;
  const role = record.role === "assistant" ? "assistant" : "user";
  const content = normalizeContentToText(record.content);
  if (!content) {
    return [];
  }

  return [{ role, content }];
}

function normalizeResponsesInputToMessages(input: unknown): CanonicalMessage[] {
  if (typeof input === "string") {
    return [{ role: "user", content: input }];
  }

  if (!Array.isArray(input)) {
    return [];
  }

  const messages: CanonicalMessage[] = [];
  for (const item of input) {
    if (typeof item === "string") {
      messages.push({ role: "user", content: item });
      continue;
    }

    if (!item || typeof item !== "object") {
      continue;
    }

    const record = item as Record<string, unknown>;
    const role = record.role === "assistant" ? "assistant" : "user";
    const content = normalizeContentToText(record.content ?? record.input_text ?? record.text);
    if (!content) {
      continue;
    }

    messages.push({ role, content });
  }

  return messages;
}

function serializeCanonicalRequest(
  request: CanonicalChatRequest,
  targetProtocol: LlmProviderProtocol,
): Record<string, unknown> {
  switch (targetProtocol) {
    case "openai-compatible":
      return {
        model: request.model,
        messages: [
          ...(request.system ? [{ role: "system", content: request.system }] : []),
          ...request.messages.map((message) => ({
            role: message.role,
            content: message.content,
          })),
        ],
        ...(request.maxTokens !== null ? { max_tokens: request.maxTokens } : {}),
        ...(request.temperature !== null ? { temperature: request.temperature } : {}),
        ...(request.topP !== null ? { top_p: request.topP } : {}),
        ...(request.stream ? { stream: true } : {}),
      };
    case "openai-responses":
      return {
        model: request.model,
        input: request.messages.map((message) => ({
          role: message.role,
          content: [{ type: "input_text", text: message.content }],
        })),
        ...(request.system ? { instructions: request.system } : {}),
        ...(request.maxTokens !== null ? { max_output_tokens: request.maxTokens } : {}),
        ...(request.temperature !== null ? { temperature: request.temperature } : {}),
        ...(request.topP !== null ? { top_p: request.topP } : {}),
        ...(request.stream ? { stream: true } : {}),
      };
    case "anthropic-messages":
      return {
        model: request.model,
        messages: request.messages.map((message) => ({
          role: message.role,
          content: [{ type: "text", text: message.content }],
        })),
        system: request.system ?? undefined,
        max_tokens: request.maxTokens ?? 1024,
        ...(request.temperature !== null ? { temperature: request.temperature } : {}),
        ...(request.topP !== null ? { top_p: request.topP } : {}),
        ...(request.stream ? { stream: true } : {}),
      };
    default:
      return {
        model: request.model,
      };
  }
}

function getProtocolPath(protocol: LlmProviderProtocol): string {
  switch (protocol) {
    case "openai-compatible":
      return "/v1/chat/completions";
    case "openai-responses":
      return "/v1/responses";
    case "anthropic-messages":
      return "/v1/messages";
    default:
      return "/";
  }
}

function normalizeToCanonicalResponse(
  body: Record<string, unknown>,
  protocol: LlmProviderProtocol,
): CanonicalResponse {
  switch (protocol) {
    case "openai-compatible":
      return normalizeOpenAiChatResponse(body);
    case "openai-responses":
      return normalizeOpenAiResponsesResponse(body);
    case "anthropic-messages":
      return normalizeAnthropicResponse(body);
    default:
      return {
        id: getStringValue(body.id),
        model: getStringValue(body.model),
        text: normalizeContentToText(body.output ?? body.content),
        finishReason: null,
        usage: {
          inputTokens: null,
          outputTokens: null,
          totalTokens: null,
        },
      };
  }
}

function normalizeOpenAiChatResponse(body: Record<string, unknown>): CanonicalResponse {
  const choices = Array.isArray(body.choices) ? body.choices : [];
  const firstChoice =
    choices.length > 0 && choices[0] && typeof choices[0] === "object"
      ? (choices[0] as Record<string, unknown>)
      : {};
  const message =
    firstChoice.message && typeof firstChoice.message === "object"
      ? (firstChoice.message as Record<string, unknown>)
      : {};
  const usage =
    body.usage && typeof body.usage === "object" ? (body.usage as Record<string, unknown>) : {};

  return {
    id: getStringValue(body.id),
    model: getStringValue(body.model),
    text: normalizeContentToText(message.content),
    finishReason: getStringValue(firstChoice.finish_reason),
    usage: {
      inputTokens: getNumberValue(usage.prompt_tokens),
      outputTokens: getNumberValue(usage.completion_tokens),
      totalTokens: getNumberValue(usage.total_tokens),
    },
  };
}

function normalizeAnthropicResponse(body: Record<string, unknown>): CanonicalResponse {
  const usage =
    body.usage && typeof body.usage === "object" ? (body.usage as Record<string, unknown>) : {};

  return {
    id: getStringValue(body.id),
    model: getStringValue(body.model),
    text: normalizeContentToText(body.content),
    finishReason: getStringValue(body.stop_reason),
    usage: {
      inputTokens: getNumberValue(usage.input_tokens),
      outputTokens: getNumberValue(usage.output_tokens),
      totalTokens:
        addNumbers(getNumberValue(usage.input_tokens), getNumberValue(usage.output_tokens)) ?? null,
    },
  };
}

function normalizeOpenAiResponsesResponse(body: Record<string, unknown>): CanonicalResponse {
  const usage =
    body.usage && typeof body.usage === "object" ? (body.usage as Record<string, unknown>) : {};

  return {
    id: getStringValue(body.id),
    model: getStringValue(body.model),
    text: extractTextFromResponsesOutput(body),
    finishReason: getStringValue(body.stop_reason) ?? getStringValue(body.status),
    usage: {
      inputTokens: getNumberValue(usage.input_tokens),
      outputTokens: getNumberValue(usage.output_tokens),
      totalTokens: getNumberValue(usage.total_tokens),
    },
  };
}

function serializeCanonicalResponse(
  response: CanonicalResponse,
  protocol: LlmInboundProtocol,
): Record<string, unknown> {
  switch (protocol) {
    case "openai-compatible":
      return {
        id: response.id ?? `chatcmpl_${crypto.randomUUID()}`,
        object: "chat.completion",
        created: Math.floor(Date.now() / 1000),
        model: response.model ?? "unknown",
        choices: [
          {
            index: 0,
            message: {
              role: "assistant",
              content: response.text,
            },
            finish_reason: mapFinishReasonToOpenAi(response.finishReason),
          },
        ],
        usage: {
          prompt_tokens: response.usage.inputTokens ?? 0,
          completion_tokens: response.usage.outputTokens ?? 0,
          total_tokens:
            response.usage.totalTokens ??
            addNumbers(response.usage.inputTokens, response.usage.outputTokens) ??
            0,
        },
      };
    case "anthropic-messages":
      return {
        id: response.id ?? `msg_${crypto.randomUUID()}`,
        type: "message",
        role: "assistant",
        model: response.model ?? "unknown",
        content: [
          {
            type: "text",
            text: response.text,
          },
        ],
        stop_reason: mapFinishReasonToAnthropic(response.finishReason),
        stop_sequence: null,
        usage: {
          input_tokens: response.usage.inputTokens ?? 0,
          output_tokens: response.usage.outputTokens ?? 0,
        },
      };
    case "openai-responses":
      return {
        id: response.id ?? `resp_${crypto.randomUUID()}`,
        object: "response",
        created_at: Math.floor(Date.now() / 1000),
        status: "completed",
        model: response.model ?? "unknown",
        output: [
          {
            id: `msg_${crypto.randomUUID()}`,
            type: "message",
            role: "assistant",
            content: [
              {
                type: "output_text",
                text: response.text,
                annotations: [],
              },
            ],
          },
        ],
        usage: {
          input_tokens: response.usage.inputTokens ?? 0,
          output_tokens: response.usage.outputTokens ?? 0,
          total_tokens:
            response.usage.totalTokens ??
            addNumbers(response.usage.inputTokens, response.usage.outputTokens) ??
            0,
        },
      };
    default:
      return {
        id: response.id,
        model: response.model,
        output_text: response.text,
      };
  }
}

function extractTextFromResponsesOutput(body: Record<string, unknown>): string {
  if (typeof body.output_text === "string") {
    return body.output_text;
  }

  const output = Array.isArray(body.output) ? body.output : [];
  const texts: string[] = [];

  for (const item of output) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const record = item as Record<string, unknown>;
    if (Array.isArray(record.content)) {
      const text = normalizeContentToText(record.content);
      if (text) {
        texts.push(text);
      }
    }
  }

  return texts.join("\n\n");
}

function normalizeContentToText(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    const parts = content
      .flatMap((part) => {
        if (typeof part === "string") {
          return [part];
        }

        if (!part || typeof part !== "object") {
          return [];
        }

        const record = part as Record<string, unknown>;
        if (typeof record.text === "string") {
          return [record.text];
        }

        if (typeof record.input_text === "string") {
          return [record.input_text];
        }

        if (typeof record.output_text === "string") {
          return [record.output_text];
        }

        return [];
      })
      .filter(Boolean);

    return parts.join("\n\n");
  }

  if (content && typeof content === "object") {
    const record = content as Record<string, unknown>;
    if (typeof record.text === "string") {
      return record.text;
    }
  }

  return "";
}

function buildGatewayErrorResponse(message: string, status: number): Response {
  return new Response(
    JSON.stringify({
      error: "LLM Adapter Error",
      message,
    }),
    {
      status,
      headers: {
        "content-type": "application/json",
      },
    },
  );
}

function mapFinishReasonToAnthropic(value: string | null): string | null {
  if (value === "stop" || value === "completed") {
    return "end_turn";
  }

  if (value === "length") {
    return "max_tokens";
  }

  return value;
}

function mapFinishReasonToOpenAi(value: string | null): string | null {
  if (value === "end_turn" || value === "completed") {
    return "stop";
  }

  if (value === "max_tokens") {
    return "length";
  }

  return value;
}

function getStringValue(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function getNumberValue(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function getBooleanValue(value: unknown): boolean {
  return value === true;
}

function addNumbers(left: number | null, right: number | null): number | null {
  if (left === null && right === null) {
    return null;
  }

  return (left ?? 0) + (right ?? 0);
}

function cloneRequestState(state: HttpRequestState): HttpRequestState {
  return {
    method: state.method,
    url: new URL(state.url.toString()),
    headers: new Headers(state.headers),
    body: state.body ? cloneArrayBuffer(state.body) : null,
  };
}
