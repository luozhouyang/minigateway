import { and, eq, like } from "drizzle-orm";
import { DatabaseService } from "../storage/database.js";
import { Repository } from "../storage/repository.js";
import { llmModels, type CreateLlmModelInput, type LlmModel } from "../storage/schema.js";

export class LlmModelRepository extends Repository<LlmModel> {
  constructor(db: DatabaseService) {
    super(db, llmModels);
  }

  async create(entity: CreateLlmModelInput): Promise<LlmModel> {
    return super.create({
      ...entity,
      enabled: entity.enabled ?? true,
      metadata: entity.metadata ?? {},
      tags: entity.tags ?? [],
    } as unknown as Omit<LlmModel, "createdAt" | "updatedAt">);
  }

  async findByProviderAndName(providerId: string, name: string): Promise<LlmModel | null> {
    return this.findFirst(and(eq(llmModels.providerId, providerId), eq(llmModels.name, name)));
  }

  async search(options: {
    providerId?: string;
    name?: string;
    enabled?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<LlmModel[]> {
    const conditions = [];
    const db = this.db.getDrizzleDb();

    if (options.providerId) {
      conditions.push(eq(llmModels.providerId, options.providerId));
    }
    if (options.name) {
      conditions.push(like(llmModels.name, `%${options.name}%`));
    }
    if (options.enabled !== undefined) {
      conditions.push(eq(llmModels.enabled, options.enabled));
    }

    let query = db.select().from(llmModels) as any;
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    if (options.limit) {
      query = query.limit(options.limit);
    }
    if (options.offset) {
      query = query.offset(options.offset);
    }

    return query.all() as unknown as LlmModel[];
  }
}
