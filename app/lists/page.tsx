import { desc, eq } from "drizzle-orm";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getDb } from "@/lib/db/client";
import { lists } from "@/lib/db/schema";
import { createList } from "./actions";
import { DeleteListButton } from "./delete-list-button";

export const metadata: Metadata = {
  title: "My Lists",
  description: "Your tier lists.",
};

const button =
  "inline-flex h-12 items-center justify-center border-4 border-line bg-accent px-5 font-body text-sm font-bold text-accent-ink shadow-[6px_6px_0_var(--line)] transition-transform hover:translate-x-1 hover:translate-y-1 hover:shadow-[4px_4px_0_var(--line)]";

const updatedFormat = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

export default async function ListsPage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    redirect("/sign-in");
  }

  const rows = await getDb()
    .select({
      id: lists.id,
      title: lists.title,
      visibility: lists.visibility,
      updatedAt: lists.updatedAt,
    })
    .from(lists)
    .where(eq(lists.userId, userId))
    .orderBy(desc(lists.updatedAt));

  return (
    <main className="min-h-screen bg-paper text-ink">
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-6 py-16">
        <a
          href="/"
          className="font-body text-xs font-bold uppercase tracking-[0.2em] text-muted underline-offset-4 hover:underline"
        >
          ← Polychkova
        </a>
        <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
          <h1 className="font-display text-5xl leading-none tracking-[-0.04em]">My Lists</h1>
          <form action={createList}>
            <button type="submit" className={button}>
              New list
            </button>
          </form>
        </div>
        {rows.length === 0 ? (
          <p className="mt-10 font-body text-base text-muted">No lists yet.</p>
        ) : (
          <ul className="mt-10 grid gap-4">
            {rows.map((row) => (
              <li
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-4 border-4 border-line bg-panel p-4 shadow-[8px_8px_0_var(--line)]"
              >
                <a href={`/lists/${row.id}`} className="min-w-0 flex-1">
                  <span className="block truncate font-display text-2xl leading-none">
                    {row.title}
                  </span>
                  <span className="mt-2 block font-body text-sm text-muted">
                    {row.visibility === "public" ? "Public" : "Unlisted"} · Updated{" "}
                    <time dateTime={row.updatedAt.toISOString()}>
                      {updatedFormat.format(row.updatedAt)} UTC
                    </time>
                  </span>
                </a>
                <DeleteListButton listId={row.id} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
