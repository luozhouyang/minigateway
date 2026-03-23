// Plugin system type definitions

import type { Consumer, Route, Service, Target } from "../entities/types.js";
import type { AppLogger } from "../utils/debug-logger.js";
import type { HttpRequestSnapshot, HttpRequestState, HttpResponseState } from "./runtime.js";

/**
 * A single persisted plugin binding.
 * One request can match many bindings, but only the most specific binding for each plugin name is used.
 */
export interface PluginInstance {
  id: string;
  name: string;
  serviceId?: string | null;
  routeId?: string | null;
  consumerId?: string | null;
  config: Record<string, unknown>;
  enabled: boolean;
  tags?: string[];
  priority?: number;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Supported execution phases.
 * The model intentionally mirrors Kong's high-level access/response/log lifecycle.
 */
export type PluginPhase = "access" | "response" | "log";

/**
 * Per-request execution context exposed to plugins.
 */
export interface PluginContext {
  phase: PluginPhase;
  requestId: string;
  route?: Route;
  service?: Service;
  consumer?: Consumer;
  target?: Target;
  plugin: PluginInstance;
  config: Record<string, unknown>;
  clientRequest: HttpRequestSnapshot;
  request: HttpRequestState;
  response?: HttpResponseState;
  shared: Map<string, unknown>;
  uriCaptures: Record<string, string>;
  logger: AppLogger;
  startedAt: number;
  upstreamStartedAt?: number;
  upstreamCompletedAt?: number;
  waitUntil: (promise: Promise<unknown>) => void;
}

/**
 * Handler result returned by a plugin.
 */
export interface PluginHandlerResult {
  stop?: boolean;
  response?: Response;
}

export type PluginHandler = (
  ctx: PluginContext,
) => Promise<PluginHandlerResult | void> | PluginHandlerResult | void;

/**
 * Plugin definition loaded by the runtime.
 */
export interface PluginDefinition {
  name: string;
  version: string;
  priority?: number;
  phases: PluginPhase[];
  configSchema?: Record<string, unknown>;
  onAccess?: PluginHandler;
  onResponse?: PluginHandler;
  onLog?: PluginHandler;
}

export type BuiltinPluginType =
  | "logger"
  | "cors"
  | "rate-limit"
  | "key-auth"
  | "file-log"
  | "request-transformer"
  | "response-transformer";

export interface BuiltinPluginConfigs {
  logger: {
    level?: "debug" | "info" | "warn" | "error";
    format?: "json" | "text";
  };

  cors: {
    origins?: string[];
    methods?: string[];
    headers?: string[];
    exposed_headers?: string[];
    credentials?: boolean;
    max_age?: number;
    private_network?: boolean;
    preflight_continue?: boolean;
  };

  "rate-limit": {
    limit: number;
    window: number;
    key?: "ip" | "header" | "consumer";
    headers?: boolean;
  };

  "key-auth": {
    key_names?: string[];
    hide_credentials?: boolean;
  };

  "file-log": {
    path: string;
    reopen?: boolean;
    include_body?: boolean;
  };

  "request-transformer": Record<string, unknown>;
  "response-transformer": Record<string, unknown>;
}
