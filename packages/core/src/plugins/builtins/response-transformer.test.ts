import { describe, expect, test } from "vite-plus/test";
import { ResponseTransformerPlugin } from "./response-transformer.js";
import { createPluginTestContext } from "../test-context.js";
import { readBodyText, writeBodyText } from "../runtime.js";

describe("ResponseTransformerPlugin", () => {
  test("transforms headers and JSON response bodies", async () => {
    const ctx = createPluginTestContext({
      phase: "response",
      response: {
        status: 200,
        statusText: "OK",
        headers: new Headers({
          "content-type": "application/json",
          "x-remove-me": "yes",
        }),
        body: writeBodyText(JSON.stringify({ oldName: "value", keep: "yes" })),
        source: "upstream",
      },
      config: {
        remove: {
          headers: ["x-remove-me"],
        },
        rename: {
          body: ["oldName:newName"],
        },
        add: {
          headers: ["x-added:true"],
          body: ["added:true"],
        },
      },
    });

    await ResponseTransformerPlugin.onResponse?.(ctx);

    expect(ctx.response?.headers.get("x-remove-me")).toBeNull();
    expect(ctx.response?.headers.get("x-added")).toBe("true");

    const body = JSON.parse(readBodyText(ctx.response?.body ?? null));
    expect(body).toEqual({
      newName: "value",
      keep: "yes",
      added: true,
    });
  });
});
