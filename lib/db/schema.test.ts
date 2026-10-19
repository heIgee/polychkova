import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { closeDb, getDb } from "./client";
import { lists, users } from "./schema";

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

describe("list table", () => {
  if (process.env.CI && !databaseUrl) {
    it("runs the database round-trip in CI", () => {
      throw new Error("DATABASE_URL is not configured");
    });
    return;
  }

  afterAll(async () => {
    await closeDb();
  });

  it.skipIf(!databaseUrl)("deletes lists when the user is deleted", async () => {
    const db = getDb();
    const userId = crypto.randomUUID();
    const listId = crypto.randomUUID();

    try {
      await db.insert(users).values({ id: userId, email: `${userId}@example.com` });
      await db.insert(lists).values({
        id: listId,
        userId,
        title: "Untitled",
        description: "",
        visibility: "unlisted",
        board: { tiers: [], itemsById: {}, unrankedItemIds: [] },
      });
      await db.delete(users).where(eq(users.id, userId));
      const rows = await db.select().from(lists).where(eq(lists.id, listId));
      expect(rows).toHaveLength(0);
    } finally {
      await db.delete(lists).where(eq(lists.id, listId));
      await db.delete(users).where(eq(users.id, userId));
    }
  });
});
