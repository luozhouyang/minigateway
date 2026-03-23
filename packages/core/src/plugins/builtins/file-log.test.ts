import { describe, expect, test } from "vite-plus/test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { FileLogPlugin } from "./file-log.js";
import { createPluginTestContext } from "../test-context.js";
import { writeBodyText } from "../runtime.js";

describe("FileLogPlugin", () => {
  test("appends a JSON log line to the configured file", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "file-log-plugin-"));
    const logPath = join(tempDir, "proxy.log");

    try {
      const ctx = createPluginTestContext({
        phase: "log",
        config: {
          path: logPath,
          include_body: true,
        },
        response: {
          status: 200,
          statusText: "OK",
          headers: new Headers({ "content-type": "application/json" }),
          body: writeBodyText(JSON.stringify({ ok: true })),
          source: "upstream",
        },
      });

      await FileLogPlugin.onLog?.(ctx);

      const line = readFileSync(logPath, "utf-8").trim();
      const parsed = JSON.parse(line);
      expect(parsed.request.id).toBe("req-1");
      expect(parsed.response.status).toBe(200);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
