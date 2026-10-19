"use server";

import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getDb } from "@/lib/db/client";
import { lists } from "@/lib/db/schema";
import { createDefaultBoard, parseListSave } from "@/lib/list-board";

async function requireUserId() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    redirect("/sign-in");
  }
  return userId;
}

export async function createList() {
  const userId = await requireUserId();
  const id = crypto.randomUUID();
  await getDb().insert(lists).values({
    id,
    userId,
    title: "Untitled",
    description: "",
    visibility: "unlisted",
    board: createDefaultBoard(),
  });
  redirect(`/lists/${id}`);
}

export async function deleteList(listId: string) {
  const userId = await requireUserId();
  await getDb()
    .delete(lists)
    .where(and(eq(lists.id, listId), eq(lists.userId, userId)));
  redirect("/lists");
}

export async function saveList(listId: string, input: { state: unknown; visibility: unknown }) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return { ok: false as const, error: "Sign in to save." };
  }

  const parsed = parseListSave(input);
  if (!parsed.ok) {
    return parsed;
  }

  const updated = await getDb()
    .update(lists)
    .set({
      title: parsed.list.title,
      description: parsed.list.description,
      visibility: parsed.list.visibility,
      board: parsed.list.board,
      updatedAt: new Date(),
    })
    .where(and(eq(lists.id, listId), eq(lists.userId, userId)))
    .returning({ id: lists.id });

  if (updated.length === 0) {
    return { ok: false as const, error: "List not found." };
  }
  return { ok: true as const };
}
