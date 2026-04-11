import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";
import starlight from "@astrojs/starlight";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  site: "https://minigateway.luozhouyang.com",
  integrations: [
    starlight({
      title: "MiniGateway",
      defaultLocale: "root",
      locales: {
        root: {
          label: "English",
          lang: "en",
        },
        zh: {
          label: "简体中文",
          lang: "zh-CN",
        },
      },
      sidebar: [
        {
          label: "Getting Started",
          items: [
            { label: "Installation", slug: "getting-started/installation" },
            { label: "Quick Start", slug: "getting-started/quick-start" },
            { label: "Configuration", slug: "getting-started/configuration" },
          ],
        },
        {
          label: "Core Concepts",
          items: [
            { label: "Architecture", slug: "core-concepts/architecture" },
            { label: "Proxy Engine", slug: "core-concepts/proxy-engine" },
            { label: "Load Balancing", slug: "core-concepts/load-balancing" },
          ],
        },
        {
          label: "Configuration",
          items: [
            { label: "Services", slug: "configuration/services" },
            { label: "Routes", slug: "configuration/routes" },
            { label: "Upstreams & Targets", slug: "configuration/upstreams" },
            { label: "Consumers & Credentials", slug: "configuration/consumers" },
          ],
        },
        {
          label: "Plugins",
          items: [
            { label: "Overview", slug: "plugins/overview" },
            {
              label: "Built-in Plugins",
              items: [
                { label: "key-auth", slug: "plugins/builtins/key-auth" },
                { label: "rate-limit", slug: "plugins/builtins/rate-limit" },
                { label: "cors", slug: "plugins/builtins/cors" },
                { label: "logger", slug: "plugins/builtins/logger" },
                { label: "file-log", slug: "plugins/builtins/file-log" },
                { label: "request-transformer", slug: "plugins/builtins/request-transformer" },
                { label: "response-transformer", slug: "plugins/builtins/response-transformer" },
                { label: "llm-router", slug: "plugins/builtins/llm-router" },
              ],
            },
          ],
        },
        {
          label: "LLM Gateway",
          items: [{ label: "Overview", slug: "llm-gateway/overview" }],
        },
        {
          label: "Admin API",
          items: [{ label: "Overview", slug: "admin-api/overview" }],
        },
        {
          label: "CLI Reference",
          items: [{ label: "Overview", slug: "cli/overview" }],
        },
      ],
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/luozhouyang/minigateway",
        },
      ],
      logo: {
        src: "./src/assets/logo.svg",
        replacesTitle: true,
      },
      tableOfContents: {
        minHeadingLevel: 2,
        maxHeadingLevel: 4,
      },
      pagination: true,
      lastUpdated: true,
      editLink: {
        baseUrl: "https://github.com/luozhouyang/minigateway/edit/main/apps/docs/",
      },
    }),
    sitemap(),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
  adapter: cloudflare({
    imageService: "cloudflare-binding",
  }),
  output: "server",
});
