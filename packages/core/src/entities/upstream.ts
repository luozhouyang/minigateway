import { DatabaseService } from "../storage/database.js";
import { Repository } from "../storage/repository.js";
import { upstreams, type CreateUpstreamInput, type Upstream } from "../storage/schema.js";
import { eq } from "drizzle-orm";

export class UpstreamRepository extends Repository<Upstream> {
  constructor(db: DatabaseService) {
    super(db, upstreams);
  }

  async create(entity: CreateUpstreamInput): Promise<Upstream> {
    return super.create({
      ...entity,
      tags: entity.tags ?? [],
    } as unknown as Omit<Upstream, "createdAt" | "updatedAt">);
  }

  async findByName(name: string): Promise<Upstream | null> {
    return this.findFirst(eq(upstreams.name, name));
  }
}
