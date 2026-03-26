import type { DatabaseService } from "./database.js";
import type { SQLiteTable } from "drizzle-orm/sqlite-core";
import { eq, desc, asc, type SQL } from "drizzle-orm";
import type { Database } from "./types.js";

export interface ListOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  order?: "asc" | "desc";
}

export abstract class Repository<T extends { id: string }> {
  protected db: Database;
  protected table: SQLiteTable;

  constructor(db: DatabaseService, table: SQLiteTable) {
    this.db = db.getDatabase();
    this.table = table;
  }

  async create(entity: Partial<Omit<T, "createdAt" | "updatedAt">>): Promise<T> {
    const [result] = await this.db.insert(this.table).values(entity).returning();
    return result as unknown as T;
  }

  async findById(id: string): Promise<T | null> {
    const result = await this.db
      .select()
      .from(this.table)
      .where(eq((this.table as any).id, id))
      .get();
    return (result as unknown as T) || null;
  }

  async findAll(options?: ListOptions): Promise<T[]> {
    let query = this.db.select().from(this.table) as any;

    if (options?.limit) {
      query = query.limit(options.limit);
    }
    if (options?.offset) {
      query = query.offset(options.offset);
    }
    if (options?.orderBy) {
      const column = (this.table as any)[options.orderBy];
      if (options.order === "desc") {
        query = query.orderBy(desc(column));
      } else {
        query = query.orderBy(asc(column));
      }
    }

    return (await query.all()) as unknown as T[];
  }

  async update(id: string, entity: Partial<T>): Promise<T> {
    const [result] = await this.db
      .update(this.table)
      .set({ ...entity, updatedAt: new Date().toISOString() } as Partial<T>)
      .where(eq((this.table as any).id, id))
      .returning();
    return result as unknown as T;
  }

  async delete(id: string): Promise<boolean> {
    const [result] = await this.db
      .delete(this.table)
      .where(eq((this.table as any).id, id))
      .returning();
    return result !== undefined;
  }

  async findFirst(where: SQL): Promise<T | null> {
    const result = await this.db.select().from(this.table).where(where).get();
    return (result as unknown as T) || null;
  }
}
