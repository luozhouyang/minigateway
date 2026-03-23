import type { PluginContext, PluginDefinition } from "../types.js";
import { applyResponseTransformations } from "./transformer-shared.js";

export const ResponseTransformerPlugin: PluginDefinition = {
  name: "response-transformer",
  version: "1.0.0",
  priority: 800,
  phases: ["response"],

  onResponse: (ctx: PluginContext): void => {
    applyResponseTransformations(ctx);
  },
};
