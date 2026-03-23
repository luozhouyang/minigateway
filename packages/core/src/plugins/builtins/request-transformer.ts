import type { PluginContext, PluginDefinition } from "../types.js";
import { applyRequestTransformations } from "./transformer-shared.js";

export const RequestTransformerPlugin: PluginDefinition = {
  name: "request-transformer",
  version: "1.0.0",
  priority: 801,
  phases: ["access"],

  onAccess: (ctx: PluginContext): void => {
    applyRequestTransformations(ctx);
  },
};
