import {
  isJsonContentType,
  readBodyText,
  writeJsonObject,
  type HttpRequestState,
} from "../runtime.js";
import type { LlmClientProfile, LlmInboundProtocol, NormalizedLlmRequest } from "./types.js";

export function detectInboundLlmProtocol(url: URL): LlmInboundProtocol {
  if (url.pathname.startsWith("/v1/responses")) {
    return "openai-responses";
  }

  if (url.pathname.startsWith("/v1/chat/completions")) {
    return "openai-compatible";
  }

  if (url.pathname.startsWith("/v1/messages")) {
    return "anthropic-messages";
  }

  return "unknown";
}

export function normalizeLlmRequest(
  request: HttpRequestState,
  clientProfile: LlmClientProfile,
): NormalizedLlmRequest {
  const jsonBody = parseJsonBody(request);

  return {
    protocol: detectInboundLlmProtocol(request.url),
    clientProfile,
    method: request.method,
    pathname: request.url.pathname,
    search: request.url.search,
    model: typeof jsonBody?.model === "string" ? jsonBody.model : null,
    jsonBody,
  };
}

export function applyNormalizedModel(
  request: HttpRequestState,
  normalizedRequest: NormalizedLlmRequest,
  model: string,
): NormalizedLlmRequest {
  if (!normalizedRequest.jsonBody) {
    return {
      ...normalizedRequest,
      model,
    };
  }

  const nextBody = {
    ...normalizedRequest.jsonBody,
    model,
  };
  writeJsonObject(request, nextBody);

  return {
    ...normalizedRequest,
    model,
    jsonBody: nextBody,
  };
}

function parseJsonBody(request: HttpRequestState): Record<string, unknown> | null {
  if (!request.body) {
    return null;
  }

  if (!isJsonContentType(request.headers.get("content-type"))) {
    return null;
  }

  try {
    const parsed = JSON.parse(readBodyText(request.body)) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }

    return { ...(parsed as Record<string, unknown>) };
  } catch {
    return null;
  }
}
