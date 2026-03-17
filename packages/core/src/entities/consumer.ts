import { DatabaseService } from "../storage/database.js";
import { Repository } from "../storage/repository.js";
import { consumers, type CreateConsumerInput, type Consumer } from "../storage/schema.js";
import { eq } from "drizzle-orm";

export class ConsumerRepository extends Repository<Consumer> {
  constructor(db: DatabaseService) {
    super(db, consumers);
  }

  async create(entity: CreateConsumerInput): Promise<Consumer> {
    return super.create({
      ...entity,
      tags: entity.tags ?? [],
    } as unknown as Omit<Consumer, "createdAt" | "updatedAt">);
  }

  async findByUsername(username: string): Promise<Consumer | null> {
    return this.findFirst(eq(consumers.username, username));
  }

  async findByCustomId(customId: string): Promise<Consumer | null> {
    return this.findFirst(eq(consumers.customId, customId));
  }
}
