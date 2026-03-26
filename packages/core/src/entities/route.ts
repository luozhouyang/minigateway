import { DatabaseService } from "../storage/database.js";
import { Repository } from "../storage/repository.js";
import { routes, type CreateRouteInput, type Route } from "../storage/schema.js";
import { eq } from "drizzle-orm";

export class RouteRepository extends Repository<Route> {
  constructor(db: DatabaseService) {
    super(db, routes);
  }

  async create(entity: CreateRouteInput): Promise<Route> {
    return super.create({
      ...entity,
      tags: entity.tags ?? [],
      protocols: entity.protocols ?? ["http", "https"],
    } as unknown as Omit<Route, "createdAt" | "updatedAt">);
  }

  async findByName(name: string): Promise<Route | null> {
    return this.findFirst(eq(routes.name, name));
  }

  async findByServiceId(serviceId: string): Promise<Route[]> {
    const result = await this.db.select().from(routes).where(eq(routes.serviceId, serviceId)).all();
    return result as unknown as Route[];
  }
}
