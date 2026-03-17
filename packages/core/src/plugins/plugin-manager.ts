import { DatabaseService } from "../storage/database.js";
import { PluginBindingRepository } from "../entities/plugin-binding.js";
import type { PluginDefinition, PluginContext, PluginPhase } from "./types.js";
import { PluginLoader } from "./plugin-loader.js";
import { eq, or, isNull } from "drizzle-orm";
import { plugins } from "../storage/schema.js";

/**
 * PluginManager - 管理插件的生命周期和执行
 */
export class PluginManager {
  private db: DatabaseService;
  private pluginRepo: PluginBindingRepository;
  private loader: PluginLoader;
  private customPlugins: Map<string, PluginDefinition> = new Map();
  private pluginsCache: Map<string, PluginDefinition> = new Map();
  private cacheValid = false;

  constructor(db: DatabaseService) {
    this.db = db;
    this.pluginRepo = new PluginBindingRepository(db);
    this.loader = new PluginLoader();
  }

  /**
   * Register a custom plugin definition
   */
  registerPlugin(plugin: PluginDefinition): void {
    this.customPlugins.set(plugin.name, plugin);
    this.invalidateCache();
  }

  /**
   * Unregister a custom plugin
   */
  unregisterPlugin(name: string): void {
    this.customPlugins.delete(name);
    this.invalidateCache();
  }

  /**
   * Get all plugins for a specific route
   */
  async getPluginsForRoute(routeId: string): Promise<PluginDefinition[]> {
    return this.getPlugins({ routeId });
  }

  /**
   * Get all plugins for a specific service
   */
  async getPluginsForService(serviceId: string): Promise<PluginDefinition[]> {
    return this.getPlugins({ serviceId });
  }

  /**
   * Get all plugins for a specific consumer
   */
  async getPluginsForConsumer(consumerId: string): Promise<PluginDefinition[]> {
    return this.getPlugins({ consumerId });
  }

  /**
   * Get all enabled plugins (global)
   */
  async getGlobalPlugins(): Promise<PluginDefinition[]> {
    return this.getPlugins({ global: true });
  }

  /**
   * Create a new plugin binding
   */
  async createPlugin(input: {
    name: string;
    serviceId?: string;
    routeId?: string;
    consumerId?: string;
    config: Record<string, unknown>;
    enabled?: boolean;
  }): Promise<void> {
    await this.pluginRepo.create({
      name: input.name,
      serviceId: input.serviceId,
      routeId: input.routeId,
      consumerId: input.consumerId,
      config: input.config,
      enabled: input.enabled ?? true,
      tags: [],
    });

    this.invalidateCache();
  }

  /**
   * Delete a plugin binding
   */
  async deletePlugin(pluginId: string): Promise<boolean> {
    const result = await this.pluginRepo.delete(pluginId);
    if (result) {
      this.invalidateCache();
    }
    return result;
  }

  /**
   * Execute plugins for a specific phase
   */
  async executePlugins(
    phase: PluginPhase,
    ctx: PluginContext,
  ): Promise<{ stopped: boolean; response?: Response; error?: Error }> {
    // Get the plugin definition for this execution
    const pluginDef = await this.loadPlugin(ctx.plugin.name);

    if (!pluginDef) {
      return { stopped: false };
    }

    // Check if plugin has handler for this phase
    const handler = this.getHandlerForPhase(pluginDef, phase);
    if (!handler) {
      return { stopped: false };
    }

    try {
      // Update context with plugin config
      ctx.config = ctx.plugin.config || {};

      // Execute handler
      const result = await handler(ctx);

      if (!result) {
        return { stopped: false };
      }

      // Handle response
      if (result.stop) {
        return { stopped: true, response: result.response };
      }

      if (result.error) {
        return { stopped: true, error: result.error };
      }

      return { stopped: false, response: result.response };
    } catch (error) {
      return {
        stopped: true,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Execute all plugins for a phase in priority order
   */
  async executeAllPlugins(
    phase: PluginPhase,
    ctx: PluginContext,
    pluginBindings: Array<{ name: string; config: Record<string, unknown> }>,
  ): Promise<{ stopped: boolean; response?: Response; error?: Error }> {
    // Sort by priority (higher first)
    const sortedPlugins = await Promise.all(
      pluginBindings.map(async (binding) => ({
        binding,
        def: await this.loadPlugin(binding.name),
      })),
    );

    sortedPlugins.sort((a, b) => {
      const aPriority = a.def?.priority ?? 0;
      const bPriority = b.def?.priority ?? 0;
      return bPriority - aPriority;
    });

    for (const { binding, def } of sortedPlugins) {
      if (!def) continue;

      const handler = this.getHandlerForPhase(def, phase);
      if (!handler) continue;

      ctx.plugin = { ...binding, id: binding.name } as any;
      ctx.config = binding.config;

      try {
        const result = await handler(ctx);

        if (result?.stop) {
          return { stopped: true, response: result.response };
        }

        if (result?.error) {
          return { stopped: true, error: result.error };
        }
      } catch (error) {
        return {
          stopped: true,
          error: error instanceof Error ? error : new Error(String(error)),
        };
      }
    }

    return { stopped: false };
  }

  /**
   * Invalidate the plugins cache
   */
  private invalidateCache(): void {
    this.cacheValid = false;
    this.pluginsCache.clear();
  }

  /**
   * Get plugins matching criteria
   */
  private async getPlugins(options: {
    routeId?: string;
    serviceId?: string;
    consumerId?: string;
    global?: boolean;
  }): Promise<PluginDefinition[]> {
    const db = this.db.getDrizzleDb();

    const conditions = [];
    if (options.routeId) {
      conditions.push(eq(plugins.routeId, options.routeId));
    }
    if (options.serviceId) {
      conditions.push(eq(plugins.serviceId, options.serviceId));
    }
    if (options.consumerId) {
      conditions.push(eq(plugins.consumerId, options.consumerId));
    }
    if (options.global) {
      conditions.push(
        or(isNull(plugins.routeId), isNull(plugins.serviceId), isNull(plugins.consumerId)),
      );
    }

    const result = db.select().from(plugins).where(eq(plugins.enabled, true)).all();

    const pluginDefs: PluginDefinition[] = [];
    for (const row of result) {
      const def = await this.loadPlugin(row.name);
      if (def) {
        pluginDefs.push({ ...def, priority: row.enabled ? 0 : 0 });
      }
    }

    return pluginDefs;
  }

  /**
   * Load a plugin by name
   */
  private async loadPlugin(name: string): Promise<PluginDefinition | null> {
    // Check cache first
    const cached = this.pluginsCache.get(name);
    if (cached) {
      return cached;
    }

    // Check custom plugins first
    const custom = this.customPlugins.get(name);
    if (custom) {
      this.pluginsCache.set(name, custom);
      return custom;
    }

    // Try to load built-in plugin
    try {
      const builtin = await this.loader.loadBuiltin(name);
      this.pluginsCache.set(name, builtin);
      return builtin;
    } catch {
      console.warn(`Plugin "${name}" not found`);
      return null;
    }
  }

  /**
   * Get handler for specific phase
   */
  private getHandlerForPhase(
    plugin: PluginDefinition,
    phase: PluginPhase,
  ): PluginDefinition["onRequest" | "onResponse" | "onError"] | null {
    switch (phase) {
      case "request":
        return plugin.onRequest || null;
      case "response":
        return plugin.onResponse || null;
      case "error":
        return plugin.onError || null;
      default:
        return null;
    }
  }
}
