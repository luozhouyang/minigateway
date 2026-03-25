import { transform } from "esbuild";
import { defineConfig, type Plugin } from "vite-plus";

const scriptExtensionPattern = /\.(?:[cm]?[jt]sx?)$/;

function resolveEsbuildLoader(id: string) {
  if (id.endsWith(".tsx")) {
    return "tsx";
  }

  if (id.endsWith(".jsx")) {
    return "jsx";
  }

  if (id.endsWith(".ts") || id.endsWith(".mts") || id.endsWith(".cts")) {
    return "ts";
  }

  return "js";
}

function createCliTestTransformPlugin(): Plugin {
  return {
    name: "cli-test-esbuild-transform",
    enforce: "pre",
    configResolved(config) {
      const filteredPlugins = config.plugins.filter((plugin) => plugin.name !== "vite:oxc");
      (config as unknown as { plugins: Plugin[] }).plugins = filteredPlugins;
    },
    async transform(code, id) {
      const [cleanId] = id.split("?");

      if (!scriptExtensionPattern.test(cleanId)) {
        return null;
      }

      const result = await transform(code, {
        format: "esm",
        loader: resolveEsbuildLoader(cleanId),
        sourcefile: cleanId,
        sourcemap: true,
        target: "es2022",
      });

      return {
        code: result.code,
        map: result.map,
      };
    },
  };
}

export default defineConfig({
  esbuild: {},
  oxc: false,
  plugins: [createCliTestTransformPlugin()],
  test: {
    environment: "node",
  },
});
