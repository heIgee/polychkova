import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { SharedTierList } from "@/components/shared-tier-list";
import { readEnv } from "@/lib/env";
import { assembleTierList } from "@/lib/list-board";
import { getSharedList } from "@/lib/shared-list";

type PageProps = { params: Promise<{ id: string }> };

function previewText(description: string) {
  return description || "A live tier list on Polychkova.";
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const list = await getSharedList((await params).id);
  if (!list) {
    return { title: "List" };
  }
  const description = previewText(list.description);
  const indexable = list.visibility === "public";
  return {
    title: list.title,
    description,
    robots: { index: indexable, follow: indexable },
    openGraph: { title: list.title, description, type: "website" },
    twitter: { card: "summary_large_image", title: list.title, description },
  };
}

export default async function SharedListPage({ params }: PageProps) {
  const { id } = await params;
  const list = await getSharedList(id);
  if (!list) {
    notFound();
  }

  const session =
    process.env.NODE_ENV === "production" || readEnv("AUTH_SECRET") ? await auth() : null;
  const userId = session?.user?.id;

  return (
    <SharedTierList
      listId={list.id}
      state={assembleTierList(list)}
      visibility={list.visibility}
      signedIn={Boolean(userId)}
      isOwner={Boolean(userId) && userId === list.userId}
    />
  );
}
