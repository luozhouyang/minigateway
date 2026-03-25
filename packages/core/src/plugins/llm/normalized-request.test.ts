import { describe, expect, test } from "vite-plus/test";
import { writeBodyText } from "../runtime.js";
import {
  applyNormalizedModel,
  detectInboundLlmProtocol,
  normalizeLlmRequest,
} from "./normalized-request.js";

describe("normalized LLM request helpers", () => {
  test("detects supported inbound protocols from path", () => {
    expect(detectInboundLlmProtocol(new URL("https://gateway.test/v1/responses"))).toBe(
      "openai-responses",
    );
    expect(detectInboundLlmProtocol(new URL("https://gateway.test/v1/chat/completions"))).toBe(
      "openai-compatible",
    );
    expect(detectInboundLlmProtocol(new URL("https://gateway.test/v1/messages"))).toBe(
      "anthropic-messages",
    );
    expect(detectInboundLlmProtocol(new URL("https://gateway.test/custom"))).toBe("unknown");
  });

  test("normalizes JSON requests and rewrites model names", () => {
    const request = {
      method: "POST",
      url: new URL("https://gateway.test/v1/messages?stream=true"),
      headers: new Headers({
        "content-type": "application/json",
      }),
      body: writeBodyText(
        JSON.stringify({
          model: "claude-sonnet-4",
          max_tokens: 1024,
        }),
      ),
    };

    const normalized = normalizeLlmRequest(request, "claude");
    expect(normalized).toMatchObject({
      protocol: "anthropic-messages",
      clientProfile: "claude",
      model: "claude-sonnet-4",
      pathname: "/v1/messages",
      search: "?stream=true",
    });

    const rewritten = applyNormalizedModel(request, normalized, "claude-sonnet-4-5");
    expect(rewritten.model).toBe("claude-sonnet-4-5");
    expect(JSON.parse(new TextDecoder().decode(request.body ?? new ArrayBuffer(0)))).toMatchObject({
      model: "claude-sonnet-4-5",
      max_tokens: 1024,
    });
  });

  test("ignores invalid or non-object JSON request bodies", () => {
    const request = {
      method: "POST",
      url: new URL("https://gateway.test/v1/responses"),
      headers: new Headers({
        "content-type": "application/json",
      }),
      body: writeBodyText("[]"),
    };

    const normalized = normalizeLlmRequest(request, "codex");
    expect(normalized).toMatchObject({
      protocol: "openai-responses",
      clientProfile: "codex",
      model: null,
      jsonBody: null,
    });
  });

  test("updates normalized model metadata even when request body is missing", () => {
    const request = {
      method: "POST",
      url: new URL("https://gateway.test/v1/responses"),
      headers: new Headers(),
      body: null,
    };

    const normalized = normalizeLlmRequest(request, "codex");
    const rewritten = applyNormalizedModel(request, normalized, "gpt-5-mini");

    expect(rewritten).toMatchObject({
      protocol: "openai-responses",
      clientProfile: "codex",
      model: "gpt-5-mini",
      jsonBody: null,
    });
    expect(request.body).toBeNull();
  });
});
