import { describe, expect, test } from "vite-plus/test";
import { RateLimitPlugin } from "./rate-limit.js";
import { createPluginTestContext } from "../test-context.js";

describe("RateLimitPlugin", () => {
  test("allows requests under the configured limit", async () => {
    const ctx = createPluginTestContext({
      clientRequest: {
        method: "GET",
        url: new URL("http://gateway.test/source"),
        headers: new Headers({ "x-forwarded-for": "203.0.113.10" }),
        body: null,
      },
      config: {
        limit: 10,
        window: 60,
      },
    });

    const result = await RateLimitPlugin.onAccess?.(ctx);

    expect(result).toBeUndefined();
  });

  test("blocks requests over the configured limit", async () => {
    const ctx = createPluginTestContext({
      clientRequest: {
        method: "GET",
        url: new URL("http://gateway.test/source"),
        headers: new Headers({ "x-forwarded-for": "203.0.113.11" }),
        body: null,
      },
      config: {
        limit: 1,
        window: 60,
      },
    });

    await RateLimitPlugin.onAccess?.(ctx);
    const result = await RateLimitPlugin.onAccess?.(ctx);

    expect(result?.stop).toBe(true);
    expect(result?.response?.status).toBe(429);
    expect(result?.response?.headers.get("retry-after")).toBeTruthy();
  });

  test("adds rate-limit headers during response phase", async () => {
    const ctx = createPluginTestContext({
      phase: "response",
      clientRequest: {
        method: "GET",
        url: new URL("http://gateway.test/source"),
        headers: new Headers({ "x-forwarded-for": "203.0.113.12" }),
        body: null,
      },
      response: {
        status: 200,
        statusText: "OK",
        headers: new Headers(),
        body: null,
        source: "upstream",
      },
      config: {
        limit: 10,
        window: 60,
        headers: true,
      },
    });

    await RateLimitPlugin.onAccess?.(ctx);
    await RateLimitPlugin.onResponse?.(ctx);

    expect(ctx.response?.headers.get("x-ratelimit-limit")).toBe("10");
    expect(ctx.response?.headers.get("x-ratelimit-remaining")).toBeTruthy();
  });
});
