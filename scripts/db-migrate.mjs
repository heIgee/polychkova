import { existsSync, readFileSync } from "node:fs";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

function loadEnvLocal() {
  if (process.env.DIRECT_URL?.trim() || !existsSync(".env.local")) {
    return;
  }

  const text = readFileSync(".env.local", "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const normalized = trimmed.startsWith("export ") ? trimmed.slice(7) : trimmed;
    const separator = normalized.indexOf("=");
    if (separator === -1) {
      continue;
    }

    const key = normalized.slice(0, separator).trim();
    let value = normalized.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadEnvLocal();

const url = process.env.DIRECT_URL?.trim();
if (!url) {
  console.error("DIRECT_URL is not configured");
  process.exit(1);
}

const sql = postgres(url, { prepare: false, max: 1 });

if (process.env.CI) {
  // Service containers cannot pass postgres -c flags. Durability is irrelevant in CI.
  await sql.unsafe("ALTER SYSTEM SET fsync = 'off'");
  await sql.unsafe("ALTER SYSTEM SET synchronous_commit = 'off'");
  await sql.unsafe("ALTER SYSTEM SET full_page_writes = 'off'");
  await sql.unsafe("SELECT pg_reload_conf()");
}

const db = drizzle(sql);
await migrate(db, { migrationsFolder: "./drizzle" });
await sql.end();
