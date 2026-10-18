import { PgDatabase } from "drizzle-orm/pg-core";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { readEnv, requireEnv } from "../env";
import * as schema from "./schema";

type Database = ReturnType<typeof drizzle<typeof schema>>;

let client: Database | undefined;
let sql: ReturnType<typeof postgres> | undefined;

export function getDb() {
  if (client) {
    return client;
  }

  const url = requireEnv(readEnv("DATABASE_URL"), "DATABASE_URL");
  // Supabase's transaction pooler rejects prepared statements.
  sql = postgres(url, { prepare: false });
  client = drizzle(sql, { schema });
  return client;
}

/** Passes Drizzle's database check without opening a connection until a query runs. */
export function lazyDb() {
  const stub = Object.create(PgDatabase.prototype) as Database;
  return new Proxy(stub, {
    get(_target, property, receiver) {
      const database = getDb();
      const value = Reflect.get(database, property, receiver);
      return typeof value === "function" ? value.bind(database) : value;
    },
  });
}

export async function closeDb() {
  await sql?.end();
  sql = undefined;
  client = undefined;
}
