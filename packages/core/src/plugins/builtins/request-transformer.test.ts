import { describe, expect, test } from "vite-plus/test";
import { RequestTransformerPlugin } from "./request-transformer.js";
import { createPluginTestContext } from "../test-context.js";
import { readBodyText, writeBodyText } from "../runtime.js";

describe("RequestTransformerPlugin", () => {
  test("transforms path, querystring, headers, and JSON body", async () => {
    const ctx = createPluginTestContext({
      clientRequest: {
        method: "POST",
        url: new URL("http://gateway.test/source?foo=1"),
        headers: new Headers({
          origin: "https://app.example",
          authorization: "Bearer token",
          "content-type": "application/json",
        }),
        body: writeBodyText(JSON.stringify({ removeMe: true, keep: "yes" })),
      },
      request: createPluginTestContext({
        clientRequest: {
          method: "POST",
          url: new URL("http://upstream.test/source?foo=1"),
          headers: new Headers({
            authorization: "Bearer token",
            "content-type": "application/json",
          }),
          body: writeBodyText(JSON.stringify({ removeMe: true, keep: "yes" })),
        },
      }).request,
      config: {
        remove: {
          headers: ["authorization"],
          querystring: ["foo"],
          body: ["removeMe"],
        },
        replace: {
          uri: "/rewritten",
          body: ['keep:"updated"'],
        },
        add: {
          headers: ["x-request-id:$(request_id)"],
          querystring: ["bar:2"],
          body: ["added:true"],
        },
        append: {
          querystring: ["bar:3"],
          body: ['items:"next"'],
        },
      },
    });

    await RequestTransformerPlugin.onAccess?.(ctx);

    expect(ctx.request.url.pathname).toBe("/rewritten");
    expect(ctx.request.url.searchParams.getAll("bar")).toEqual(["2", "3"]);
    expect(ctx.request.headers.get("authorization")).toBeNull();
    expect(ctx.request.headers.get("x-request-id")).toBe("req-1");

    const body = JSON.parse(readBodyText(ctx.request.body));
    expect(body).toEqual({
      keep: "updated",
      added: true,
      items: "next",
    });
  });
});
