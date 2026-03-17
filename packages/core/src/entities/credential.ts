import { DatabaseService } from "../storage/database.js";
import { Repository } from "../storage/repository.js";
import { credentials, type CreateCredentialInput, type Credential } from "../storage/schema.js";
import { eq } from "drizzle-orm";

export class CredentialRepository extends Repository<Credential> {
  constructor(db: DatabaseService) {
    super(db, credentials);
  }

  async create(entity: CreateCredentialInput): Promise<Credential> {
    return super.create({
      ...entity,
      tags: entity.tags ?? [],
    } as unknown as Omit<Credential, "createdAt">);
  }

  async findByConsumerId(consumerId: string): Promise<Credential[]> {
    const result = this.db
      .getDrizzleDb()
      .select()
      .from(credentials)
      .where(eq(credentials.consumerId, consumerId))
      .all();
    return result as unknown as Credential[];
  }
}
