export const LLM_CLIENT_PROFILES = [
  "codex",
  "claude",
  "gemini",
  "openai-compatible",
  "unknown",
] as const;

export const LLM_PROVIDER_PROTOCOLS = [
  "passthrough",
  "openai-compatible",
  "openai-responses",
  "anthropic-messages",
] as const;

export const LLM_PROVIDER_VENDORS = [
  "openai",
  "anthropic",
  "kimi",
  "glm",
  "deepseek",
  "custom",
] as const;

export const LLM_INBOUND_PROTOCOLS = [
  "openai-compatible",
  "openai-responses",
  "anthropic-messages",
  "unknown",
] as const;

export type LlmClientProfile = (typeof LLM_CLIENT_PROFILES)[number];
export type LlmProviderProtocol = (typeof LLM_PROVIDER_PROTOCOLS)[number];
export type LlmProviderVendor = (typeof LLM_PROVIDER_VENDORS)[number];
export type LlmInboundProtocol = (typeof LLM_INBOUND_PROTOCOLS)[number];

export interface NormalizedLlmRequest {
  protocol: LlmInboundProtocol;
  clientProfile: LlmClientProfile;
  method: string;
  pathname: string;
  search: string;
  model: string | null;
  jsonBody: Record<string, unknown> | null;
}
