import { and, eq } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { OwnedListEditor } from "@/components/owned-list-editor";
import { getDb } from "@/lib/db/client";
import { lists } from "@/lib/db/schema";
import { igdbConfigured } from "@/lib/igdb";
import { assembleTierList, parseStoredList } from "@/lib/list-board";

export const metadata: Metadata = {
  title: "Edit list",
  description: "Edit your tier list.",
};

export default async function OwnedListPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    redirect("/sign-in");
  }

  const [row] = await getDb()
    .select()
    .from(lists)
    .where(and(eq(lists.id, id), eq(lists.userId, userId)));
  if (!row) {
    notFound();
  }

  const parsed = parseStoredList(row);
  if (!parsed.ok) {
    notFound();
  }

  return (
    <OwnedListEditor
      listId={row.id}
      initialState={assembleTierList(parsed.list)}
      initialVisibility={parsed.list.visibility}
      gameSearch={igdbConfigured()}
    />
  );
}
