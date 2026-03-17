import { DatabaseService } from "../storage/database.js";
import { Repository } from "../storage/repository.js";
import { targets, type CreateTargetInput, type Target } from "../storage/schema.js";
import { eq } from "drizzle-orm";

export class TargetRepository extends Repository<Target> {
  constructor(db: DatabaseService) {
    super(db, targets);
  }

  async create(entity: CreateTargetInput): Promise<Target> {
    return super.create({
      ...entity,
      tags: entity.tags ?? [],
    } as unknown as Omit<Target, "createdAt">);
  }

  async findByUpstreamId(upstreamId: string): Promise<Target[]> {
    const result = this.db
      .getDrizzleDb()
      .select()
      .from(targets)
      .where(eq(targets.upstreamId, upstreamId))
      .all();
    return result as unknown as Target[];
  }
}
