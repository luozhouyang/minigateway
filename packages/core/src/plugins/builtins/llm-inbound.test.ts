import { describe, expect, test } from "vite-plus/test";
import { getNormalizedLlmRequest, setNormalizedLlmRequest } from "../llm/context.js";
import { writeBodyText } from "../runtime.js";
import { createPluginTestContext } from "../test-context.js";
import { LlmInboundAnthropicPlugin } from "./llm-inbound-anthropic.js";
import { LlmInboundOpenAIPlugin } from "./llm-inbound-openai.js";

describe("LLM inbound plugins", () => {
  test("normalizes OpenAI responses requests into shared LLM context", async () => {
    const ctx = createPluginTestContext({
      clientRequest: {
        method: "POST",
        url: new URL("http://gateway.test/v1/responses"),
        headers: new Headers({
          "content-type": "application/json",
        }),
        body: writeBodyText(JSON.stringify({ model: "gpt-5", input: "hello" })),
      },
    });

    await LlmInboundOpenAIPlugin.onAccess?.(ctx);

    expect(getNormalizedLlmRequest(ctx.shared)).toMatchObject({
      protocol: "openai-responses",
      clientProfile: "codex",
      model: "gpt-5",
    });
  });

  test("normalizes Anthropic messages requests into shared LLM context", async () => {
    const ctx = createPluginTestContext({
      clientRequest: {
        method: "POST",
        url: new URL("http://gateway.test/v1/messages"),
        headers: new Headers({
          "content-type": "application/json",
        }),
        body: writeBodyText(
          JSON.stringify({
            model: "claude-sonnet-4",
            messages: [{ role: "user", content: "hello" }],
          }),
        ),
      },
    });

    await LlmInboundAnthropicPlugin.onAccess?.(ctx);

    expect(getNormalizedLlmRequest(ctx.shared)).toMatchObject({
      protocol: "anthropic-messages",
      clientProfile: "claude",
      model: "claude-sonnet-4",
    });
  });

  test("normalizes OpenAI chat completions requests into shared LLM context", async () => {
    const ctx = createPluginTestContext({
      clientRequest: {
        method: "POST",
        url: new URL("http://gateway.test/v1/chat/completions"),
        headers: new Headers({
          "content-type": "application/json",
        }),
        body: writeBodyText(
          JSON.stringify({
            model: "gpt-4.1-mini",
            messages: [{ role: "user", content: "hello" }],
          }),
        ),
      },
    });

    await LlmInboundOpenAIPlugin.onAccess?.(ctx);

    expect(getNormalizedLlmRequest(ctx.shared)).toMatchObject({
      protocol: "openai-compatible",
      clientProfile: "openai-compatible",
      model: "gpt-4.1-mini",
    });
  });

  test("does not overwrite an existing normalized request", async () => {
    const ctx = createPluginTestContext({
      clientRequest: {
        method: "POST",
        url: new URL("http://gateway.test/v1/responses"),
        headers: new Headers({
          "content-type": "application/json",
        }),
        body: writeBodyText(JSON.stringify({ model: "gpt-5", input: "hello" })),
      },
    });

    setNormalizedLlmRequest(ctx.shared, {
      protocol: "anthropic-messages",
      clientProfile: "claude",
      method: "POST",
      pathname: "/v1/messages",
      search: "",
      model: "claude-sonnet-4",
      jsonBody: {
        model: "claude-sonnet-4",
      },
    });

    await LlmInboundOpenAIPlugin.onAccess?.(ctx);

    expect(getNormalizedLlmRequest(ctx.shared)).toMatchObject({
      protocol: "anthropic-messages",
      clientProfile: "claude",
      model: "claude-sonnet-4",
    });
  });
});
