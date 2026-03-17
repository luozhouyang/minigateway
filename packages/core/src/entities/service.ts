import { DatabaseService } from "../storage/database.js";
import { Repository } from "../storage/repository.js";
import { services, type CreateServiceInput, type Service } from "../storage/schema.js";
import { eq, like } from "drizzle-orm";

export class ServiceRepository extends Repository<Service> {
  constructor(db: DatabaseService) {
    super(db, services);
  }

  async create(entity: CreateServiceInput): Promise<Service> {
    return super.create({
      ...entity,
      tags: entity.tags ?? [],
    } as unknown as Omit<Service, "createdAt" | "updatedAt">);
  }

  async findByName(name: string): Promise<Service | null> {
    return this.findFirst(eq(services.name, name));
  }

  async search(options: {
    name?: string;
    protocol?: string;
    tags?: string[];
    limit?: number;
    offset?: number;
  }): Promise<Service[]> {
    const conditions = [];
    const db = this.db.getDrizzleDb();

    if (options.name) {
      conditions.push(like(services.name, `%${options.name}%`));
    }
    if (options.protocol) {
      conditions.push(eq(services.protocol, options.protocol));
    }

    let query = db.select().from(services) as any;

    if (conditions.length > 0) {
      query = query.where(conditions[0]);
      for (let i = 1; i < conditions.length; i++) {
        query = query.and(conditions[i]);
      }
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }
    if (options.offset) {
      query = query.offset(options.offset);
    }

    return query.all() as unknown as Service[];
  }
}
