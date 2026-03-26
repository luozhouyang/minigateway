import { and, eq, like, type SQL } from "drizzle-orm";
import { DatabaseService } from "../storage/database.js";
import { Repository } from "../storage/repository.js";
import { llmProviders, type CreateLlmProviderInput, type LlmProvider } from "../storage/schema.js";

export class LlmProviderRepository extends Repository<LlmProvider> {
  constructor(db: DatabaseService) {
    super(db, llmProviders);
  }

  async create(entity: CreateLlmProviderInput): Promise<LlmProvider> {
    return super.create({
      ...entity,
      displayName: entity.displayName ?? entity.name,
      enabled: entity.enabled ?? true,
      headers: entity.headers ?? {},
      auth: entity.auth ?? { type: "none" },
      adapterConfig: entity.adapterConfig ?? {},
      tags: entity.tags ?? [],
    } as unknown as Omit<LlmProvider, "createdAt" | "updatedAt">);
  }

  async findByName(name: string): Promise<LlmProvider | null> {
    return this.findFirst(eq(llmProviders.name, name));
  }

  async search(options: {
    name?: string;
    vendor?: string;
    protocol?: string;
    enabled?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<LlmProvider[]> {
    const conditions: SQL[] = [];

    if (options.name) {
      conditions.push(like(llmProviders.name, `%${options.name}%`));
    }
    if (options.vendor) {
      conditions.push(eq(llmProviders.vendor, options.vendor as LlmProvider["vendor"]));
    }
    if (options.protocol) {
      conditions.push(eq(llmProviders.protocol, options.protocol as LlmProvider["protocol"]));
    }
    if (options.enabled !== undefined) {
      conditions.push(eq(llmProviders.enabled, options.enabled));
    }

    let query = this.db.select().from(llmProviders) as any;
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    if (options.limit) {
      query = query.limit(options.limit);
    }
    if (options.offset) {
      query = query.offset(options.offset);
    }

    return (await query.all()) as unknown as LlmProvider[];
  }
}
