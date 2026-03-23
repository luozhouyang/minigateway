import { describe, expect, test } from "vite-plus/test";
import { CorsPlugin } from "./cors.js";
import { createPluginTestContext } from "../test-context.js";
import { writeBodyText } from "../runtime.js";

describe("CorsPlugin", () => {
  test("has Kong-like metadata", () => {
    expect(CorsPlugin.name).toBe("cors");
    expect(CorsPlugin.priority).toBe(2000);
    expect(CorsPlugin.phases).toEqual(["access", "response"]);
  });

  test("short-circuits preflight requests by default", async () => {
    const ctx = createPluginTestContext({
      clientRequest: {
        method: "OPTIONS",
        url: new URL("http://gateway.test/source"),
        headers: new Headers({
          origin: "https://app.example",
          "access-control-request-method": "POST",
          "access-control-request-headers": "authorization, content-type",
        }),
        body: null,
      },
      config: {
        origins: ["https://app.example"],
        methods: ["GET", "POST"],
      },
    });

    const result = await CorsPlugin.onAccess?.(ctx);

    expect(result?.stop).toBe(true);
    expect(result?.response?.status).toBe(204);
    expect(result?.response?.headers.get("access-control-allow-origin")).toBe(
      "https://app.example",
    );
  });

  test("adds actual response headers during response phase", async () => {
    const ctx = createPluginTestContext({
      phase: "response",
      clientRequest: {
        method: "GET",
        url: new URL("http://gateway.test/source"),
        headers: new Headers({ origin: "https://app.example" }),
        body: null,
      },
      response: {
        status: 200,
        statusText: "OK",
        headers: new Headers(),
        body: writeBodyText(JSON.stringify({ ok: true })),
        source: "upstream",
      },
      config: {
        origins: ["https://app.example"],
        credentials: true,
        exposed_headers: ["x-request-id"],
      },
    });

    await CorsPlugin.onResponse?.(ctx);

    expect(ctx.response?.headers.get("access-control-allow-origin")).toBe("https://app.example");
    expect(ctx.response?.headers.get("access-control-allow-credentials")).toBe("true");
    expect(ctx.response?.headers.get("access-control-expose-headers")).toBe("x-request-id");
  });

  test("rejects disallowed preflight origins", async () => {
    const ctx = createPluginTestContext({
      clientRequest: {
        method: "OPTIONS",
        url: new URL("http://gateway.test/source"),
        headers: new Headers({
          origin: "https://blocked.example",
          "access-control-request-method": "GET",
        }),
        body: null,
      },
      config: {
        origins: ["https://allowed.example"],
      },
    });

    const result = await CorsPlugin.onAccess?.(ctx);

    expect(result?.stop).toBe(true);
    expect(result?.response?.status).toBe(403);
  });
});
