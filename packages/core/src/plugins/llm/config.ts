import { z } from "zod";
import { LLM_CLIENT_PROFILES, LLM_PROVIDER_PROTOCOLS, LLM_PROVIDER_VENDORS } from "./types.js";

export const ResolvedLlmClientProfileSchema = z.enum(LLM_CLIENT_PROFILES);
export const LlmClientProfileSchema = z.union([z.literal("auto"), ResolvedLlmClientProfileSchema]);

export const LlmProviderAuthSchema = z
  .object({
    type: z.enum(["none", "bearer", "api-key"]).default("none"),
    token: z.string().min(1).optional(),
    tokenEnv: z.string().min(1).optional(),
    key: z.string().min(1).optional(),
    keyEnv: z.string().min(1).optional(),
    headerName: z.string().min(1).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.type === "bearer" && !value.token && !value.tokenEnv) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Bearer auth requires token or tokenEnv",
      });
    }

    if (value.type === "api-key" && !value.key && !value.keyEnv) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "API key auth requires key or keyEnv",
      });
    }
  });

export const LlmProviderResourceSchema = z.object({
  name: z.string().min(1),
  displayName: z.string().min(1).optional(),
  vendor: z.enum(LLM_PROVIDER_VENDORS),
  enabled: z.boolean().default(true),
  protocol: z.enum(LLM_PROVIDER_PROTOCOLS).default("passthrough"),
  baseUrl: z.string().url(),
  clients: z.array(ResolvedLlmClientProfileSchema).optional(),
  headers: z.record(z.string(), z.string()).default({}),
  auth: LlmProviderAuthSchema.default({ type: "none" }),
  adapterConfig: z.record(z.string(), z.unknown()).default({}),
});

export const LlmModelResourceSchema = z.object({
  providerId: z.string().min(1),
  name: z.string().min(1),
  upstreamModel: z.string().min(1),
  enabled: z.boolean().default(true),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export const LlmClientRuleSchema = z.object({
  match: z
    .object({
      pathPrefix: z.string().min(1).optional(),
      method: z.string().min(1).optional(),
      header: z
        .object({
          name: z.string().min(1),
          value: z.string().min(1).optional(),
        })
        .optional(),
    })
    .default({}),
  client: ResolvedLlmClientProfileSchema,
});

export const LlmRouterConfigSchema = z.object({
  clientProfile: LlmClientProfileSchema.default("auto"),
  requestTimeoutMs: z.number().int().positive().max(300_000).default(120_000),
  maxRetries: z.number().int().min(0).max(10).default(2),
  retryOnStatus: z.array(z.number().int().min(100).max(599)).default([429, 500, 502, 503, 504]),
  clientRules: z.array(LlmClientRuleSchema).default([]),
  circuitBreaker: z
    .object({
      failureThreshold: z.number().int().min(1).max(20).default(4),
      successThreshold: z.number().int().min(1).max(10).default(2),
      openTimeoutMs: z.number().int().min(0).max(300_000).default(60_000),
      minimumRequests: z.number().int().min(1).max(100).default(10),
      errorRateThreshold: z.number().min(0).max(1).default(0.6),
    })
    .default({
      failureThreshold: 4,
      successThreshold: 2,
      openTimeoutMs: 60_000,
      minimumRequests: 10,
      errorRateThreshold: 0.6,
    }),
  logging: z
    .object({
      enabled: z.boolean().default(true),
      storeBodies: z.boolean().default(false),
    })
    .default({
      enabled: true,
      storeBodies: false,
    }),
});

export type LlmProviderAuthConfig = z.output<typeof LlmProviderAuthSchema>;
export type LlmProviderResourceConfig = z.output<typeof LlmProviderResourceSchema>;
export type LlmModelResourceConfig = z.output<typeof LlmModelResourceSchema>;
export type LlmClientRuleConfig = z.output<typeof LlmClientRuleSchema>;
export type LlmRouterPluginConfig = z.output<typeof LlmRouterConfigSchema>;
