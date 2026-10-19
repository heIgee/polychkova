"use server";

import { and, eq, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getDb } from "@/lib/db/client";
import { listImages, lists } from "@/lib/db/schema";
import {
  createDefaultBoard,
  forkBoard,
  hasForeignListImage,
  parseListSave,
  parseStoredList,
  removedListImageIds,
  retainedListImageIds,
} from "@/lib/list-board";

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

export async function publishList(formData: FormData) {
  const listId = formData.get("listId");
  if (typeof listId !== "string" || listId === "") {
    redirect("/lists");
  }
  const userId = await requireUserId();
  const [updated] = await getDb()
    .update(lists)
    .set({ visibility: "public", updatedAt: new Date() })
    .where(and(eq(lists.id, listId), eq(lists.userId, userId)))
    .returning({ id: lists.id });
  if (!updated) {
    redirect("/lists");
  }
  redirect(`/l/${listId}`);
}

export async function forkList(formData: FormData) {
  const listId = formData.get("listId");
  if (typeof listId !== "string" || listId === "") {
    redirect("/discover");
  }

  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    redirect(`/sign-in?next=${encodeURIComponent(`/l/${listId}`)}`);
  }

  const [row] = await getDb().select().from(lists).where(eq(lists.id, listId));
  if (!row) {
    redirect("/discover");
  }
  const parsed = parseStoredList(row);
  if (!parsed.ok) {
    redirect("/discover");
  }

  const nextId = crypto.randomUUID();
  const cited = retainedListImageIds(parsed.list.board, listId);
  const copies =
    cited.length === 0
      ? []
      : await getDb()
          .select()
          .from(listImages)
          .where(and(eq(listImages.listId, listId), inArray(listImages.id, cited)));
  const imageIds = new Map<string, string>();
  const imageRows = copies.map((copy) => {
    const id = crypto.randomUUID();
    imageIds.set(copy.id, id);
    return { id, listId: nextId, bytes: copy.bytes, type: copy.type };
  });
  const board = forkBoard(parsed.list.board, listId, nextId, imageIds);

  await getDb().transaction(async (tx) => {
    await tx.insert(lists).values({
      id: nextId,
      userId,
      title: parsed.list.title,
      description: parsed.list.description,
      visibility: "unlisted",
      board,
    });
    if (imageRows.length > 0) {
      await tx.insert(listImages).values(imageRows);
    }
  });
  redirect(`/lists/${nextId}`);
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
  if (hasForeignListImage(parsed.list.board, listId)) {
    return { ok: false as const, error: "Invalid list." };
  }

  const saved = await getDb().transaction(async (tx) => {
    const [current] = await tx
      .select({
        title: lists.title,
        description: lists.description,
        visibility: lists.visibility,
        board: lists.board,
      })
      .from(lists)
      .where(and(eq(lists.id, listId), eq(lists.userId, userId)));
    if (!current) {
      return false;
    }

    await tx
      .update(lists)
      .set({
        title: parsed.list.title,
        description: parsed.list.description,
        visibility: parsed.list.visibility,
        board: parsed.list.board,
        updatedAt: new Date(),
      })
      .where(and(eq(lists.id, listId), eq(lists.userId, userId)));

    // An upload row exists before the board cites it. Only images that left the
    // previously saved board are safe to remove; a newer in-flight save still has them.
    const stored = parseStoredList(current);
    const drop = stored.ok ? removedListImageIds(stored.list.board, parsed.list.board, listId) : [];
    if (drop.length > 0) {
      await tx
        .delete(listImages)
        .where(and(eq(listImages.listId, listId), inArray(listImages.id, drop)));
    }
    return true;
  });

  if (!saved) {
    return { ok: false as const, error: "List not found." };
  }
  return { ok: true as const };
}
