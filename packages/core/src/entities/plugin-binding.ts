import { DatabaseService } from "../storage/database.js";
import { Repository } from "../storage/repository.js";
import { plugins, type CreatePluginBindingInput } from "../storage/schema.js";
import { type PluginBinding } from "./types.js";
import { eq } from "drizzle-orm";

export class PluginBindingRepository extends Repository<PluginBinding> {
  constructor(db: DatabaseService) {
    super(db, plugins);
  }

  async create(entity: CreatePluginBindingInput): Promise<PluginBinding> {
    return super.create({
      ...entity,
      tags: entity.tags ?? [],
      config: entity.config ?? {},
    } as unknown as Omit<PluginBinding, "createdAt" | "updatedAt">);
  }

  async findByServiceId(serviceId: string): Promise<PluginBinding[]> {
    const result = this.db
      .getDrizzleDb()
      .select()
      .from(plugins)
      .where(eq(plugins.serviceId, serviceId))
      .all();
    return result as unknown as PluginBinding[];
  }

  async findByRouteId(routeId: string): Promise<PluginBinding[]> {
    const result = this.db
      .getDrizzleDb()
      .select()
      .from(plugins)
      .where(eq(plugins.routeId, routeId))
      .all();
    return result as unknown as PluginBinding[];
  }

  async findByConsumerId(consumerId: string): Promise<PluginBinding[]> {
    const result = this.db
      .getDrizzleDb()
      .select()
      .from(plugins)
      .where(eq(plugins.consumerId, consumerId))
      .all();
    return result as unknown as PluginBinding[];
  }
}
