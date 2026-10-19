import { and, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { getDb } from "@/lib/db/client";
import { listImages, lists } from "@/lib/db/schema";
import { parseStoredList, retainedListImageIds } from "@/lib/list-board";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string; imageId: string }> },
) {
  const { id: listId, imageId } = await context.params;
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return new Response(null, { status: 404 });
  }

  const [owned] = await getDb()
    .select({ id: lists.id })
    .from(lists)
    .where(and(eq(lists.id, listId), eq(lists.userId, userId)));
  if (!owned) {
    return new Response(null, { status: 404 });
  }

  const [row] = await getDb()
    .select({ bytes: listImages.bytes, type: listImages.type })
    .from(listImages)
    .where(and(eq(listImages.id, imageId), eq(listImages.listId, listId)));
  if (!row) {
    return new Response(null, { status: 404 });
  }

  return new Response(new Uint8Array(row.bytes), {
    headers: {
      "Content-Type": row.type,
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string; imageId: string }> },
) {
  const { id: listId, imageId } = await context.params;
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return new Response(null, { status: 404 });
  }

  await getDb().transaction(async (tx) => {
    const [owned] = await tx
      .select({
        title: lists.title,
        description: lists.description,
        visibility: lists.visibility,
        board: lists.board,
      })
      .from(lists)
      .where(and(eq(lists.id, listId), eq(lists.userId, userId)));
    if (!owned) {
      return;
    }
    const stored = parseStoredList(owned);
    if (!stored.ok || retainedListImageIds(stored.list.board, listId).includes(imageId)) {
      return;
    }
    await tx
      .delete(listImages)
      .where(and(eq(listImages.id, imageId), eq(listImages.listId, listId)));
  });
  return new Response(null, { status: 204 });
}
