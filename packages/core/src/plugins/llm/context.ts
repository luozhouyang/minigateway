import type { NormalizedLlmRequest } from "./types.js";

const NORMALIZED_LLM_REQUEST_KEY = "llm.normalized.request";

export function getNormalizedLlmRequest(shared: Map<string, unknown>): NormalizedLlmRequest | null {
  const normalizedRequest = shared.get(NORMALIZED_LLM_REQUEST_KEY);
  if (!normalizedRequest || typeof normalizedRequest !== "object") {
    return null;
  }

  return normalizedRequest as NormalizedLlmRequest;
}

export function setNormalizedLlmRequest(
  shared: Map<string, unknown>,
  normalizedRequest: NormalizedLlmRequest,
): void {
  shared.set(NORMALIZED_LLM_REQUEST_KEY, normalizedRequest);
  shared.set("llm.normalized.client", normalizedRequest.clientProfile);
  shared.set("llm.normalized.protocol", normalizedRequest.protocol);

  if (normalizedRequest.model) {
    shared.set("llm.normalized.model", normalizedRequest.model);
    return;
  }

  shared.delete("llm.normalized.model");
}
