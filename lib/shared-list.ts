import { eq } from "drizzle-orm";
import { connection } from "next/server";
import { cache } from "react";
import { getDb } from "./db/client";
import { lists } from "./db/schema";
import { parseStoredList } from "./list-board";

export const getSharedList = cache(async (id: string) => {
  await connection();
  const [row] = await getDb()
    .select({
      id: lists.id,
      userId: lists.userId,
      title: lists.title,
      description: lists.description,
      visibility: lists.visibility,
      board: lists.board,
      updatedAt: lists.updatedAt,
    })
    .from(lists)
    .where(eq(lists.id, id));
  if (!row) {
    return null;
  }
  const parsed = parseStoredList(row);
  if (!parsed.ok) {
    return null;
  }
  return {
    id: row.id,
    userId: row.userId,
    updatedAt: row.updatedAt,
    ...parsed.list,
  };
});
