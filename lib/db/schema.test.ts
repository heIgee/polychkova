import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { closeDb, getDb } from "./client";
import { users } from "./schema";

const databaseUrl = process.env.DATABASE_URL?.trim();

describe("user table", () => {
  if (process.env.CI && !databaseUrl) {
    it("runs the database round-trip in CI", () => {
      throw new Error("DATABASE_URL is not configured");
    });
    return;
  }

  afterAll(async () => {
    await closeDb();
  });

  it.skipIf(!databaseUrl)("round-trips a user", async () => {
    const db = getDb();
    const id = crypto.randomUUID();
    const email = `${id}@example.com`;

    try {
      await db.insert(users).values({ id, name: "Test", email });
      const rows = await db.select().from(users).where(eq(users.id, id));
      expect(rows).toHaveLength(1);
      expect(rows[0]?.name).toBe("Test");
      expect(rows[0]?.email).toBe(email);
    } finally {
      await db.delete(users).where(eq(users.id, id));
    }
  });
});
