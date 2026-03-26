import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema.js";

export type DatabaseClient = ReturnType<typeof createClient>;
export type DatabaseTransaction = Awaited<ReturnType<DatabaseClient["transaction"]>>;
export type Database = ReturnType<typeof drizzle<typeof schema>>;
