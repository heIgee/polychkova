import { and, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { getDb } from "@/lib/db/client";
import { listImages, lists } from "@/lib/db/schema";
import { parseImageUpload } from "@/lib/image-bytes";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id: listId } = await context.params;
  const userId = await ownedList(listId);
  if (!userId) {
    return Response.json({ error: "List not found." }, { status: 404 });
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "Image is required." }, { status: 400 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const parsed = parseImageUpload(bytes);
  if (!parsed.ok) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }

  const imageId = crypto.randomUUID();
  await getDb()
    .insert(listImages)
    .values({
      id: imageId,
      listId,
      bytes: Buffer.from(bytes),
      type: parsed.type,
    });

  return Response.json({ imageUrl: `/api/lists/${listId}/images/${imageId}` });
}

async function ownedList(listId: string) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return null;
  }
  const [row] = await getDb()
    .select({ id: lists.id })
    .from(lists)
    .where(and(eq(lists.id, listId), eq(lists.userId, userId)));
  return row ? userId : null;
}
