import { describe, expect, test } from "vite-plus/test";
import { KeyAuthPlugin } from "./key-auth.js";
import { createPluginTestContext } from "../test-context.js";

describe("KeyAuthPlugin", () => {
  test("has Kong-like metadata", () => {
    expect(KeyAuthPlugin.name).toBe("key-auth");
    expect(KeyAuthPlugin.priority).toBe(1250);
    expect(KeyAuthPlugin.phases).toEqual(["access"]);
  });

  test("returns 401 when credentials are missing", async () => {
    const ctx = createPluginTestContext();

    const result = await KeyAuthPlugin.onAccess?.(ctx);

    expect(result?.stop).toBe(true);
    expect(result?.response?.status).toBe(401);
  });

  test("accepts credentials from headers and strips them from upstream request", async () => {
    const ctx = createPluginTestContext({
      clientRequest: {
        method: "GET",
        url: new URL("http://gateway.test/source"),
        headers: new Headers({ "x-api-key": "secret-key" }),
        body: null,
      },
      request: createPluginTestContext({
        clientRequest: {
          method: "GET",
          url: new URL("http://upstream.test/resource"),
          headers: new Headers({ "x-api-key": "secret-key" }),
          body: null,
        },
      }).request,
      config: {
        key_names: ["x-api-key"],
        hide_credentials: true,
      },
    });

    const result = await KeyAuthPlugin.onAccess?.(ctx);

    expect(result).toBeUndefined();
    expect(ctx.shared.get("authenticated")).toBe(true);
    expect(ctx.request.headers.has("x-api-key")).toBe(false);
  });

  test("validates against a provided credentials cache", async () => {
    const shared = new Map<string, unknown>();
    shared.set("credentials-cache", new Map([["valid-key", { consumerId: "c1" }]]));
    const ctx = createPluginTestContext({
      clientRequest: {
        method: "GET",
        url: new URL("http://gateway.test/source?apikey=valid-key"),
        headers: new Headers(),
        body: null,
      },
      shared,
      config: {
        key_names: ["apikey"],
      },
    });

    const result = await KeyAuthPlugin.onAccess?.(ctx);

    expect(result).toBeUndefined();
    expect(ctx.shared.get("api-key")).toBe("valid-key");
  });
});
