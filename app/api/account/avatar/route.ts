import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { getDb } from "@/lib/db/client";
import { users } from "@/lib/db/schema";

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return new Response(null, { status: 401 });
  }

  const [row] = await getDb()
    .select({ avatar: users.avatar, avatarType: users.avatarType })
    .from(users)
    .where(eq(users.id, userId));
  if (!row?.avatar || !row.avatarType) {
    return new Response(null, { status: 404 });
  }

  return new Response(new Uint8Array(row.avatar), {
    headers: {
      "Content-Type": row.avatarType,
      "Cache-Control": "private, no-store",
    },
  });
}
