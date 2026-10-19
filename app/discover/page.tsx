import { and, desc, eq, sql } from "drizzle-orm";
import type { Metadata } from "next";
import { connection } from "next/server";
import { getDb } from "@/lib/db/client";
import { lists, users } from "@/lib/db/schema";
import { titleLikePattern, titleSearch } from "@/lib/site";

export const metadata: Metadata = {
  title: "Discover",
  description: "Browse recent public tier lists.",
};

const updatedFormat = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

const field =
  "h-12 min-w-0 flex-1 border-4 border-line bg-panel px-3 font-body text-base text-ink shadow-[6px_6px_0_var(--line)]";
const button =
  "inline-flex h-12 items-center justify-center border-4 border-line bg-accent px-5 font-body text-sm font-bold text-accent-ink shadow-[6px_6px_0_var(--line)] transition-transform hover:translate-x-1 hover:translate-y-1 hover:shadow-[4px_4px_0_var(--line)]";

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await connection();
  const query = titleSearch((await searchParams).q);
  const rows = await getDb()
    .select({
      id: lists.id,
      title: lists.title,
      description: lists.description,
      updatedAt: lists.updatedAt,
      author: users.name,
    })
    .from(lists)
    .innerJoin(users, eq(lists.userId, users.id))
    .where(
      query
        ? and(
            eq(lists.visibility, "public"),
            sql`${lists.title} ilike ${titleLikePattern(query)} escape '\\'`,
          )
        : eq(lists.visibility, "public"),
    )
    .orderBy(desc(lists.updatedAt))
    .limit(40);

  return (
    <main className="min-h-screen bg-paper text-ink">
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-6 py-16">
        <a
          href="/"
          className="font-body text-xs font-bold uppercase tracking-[0.2em] text-muted underline-offset-4 hover:underline"
        >
          ← Polychkova
        </a>
        <h1 className="mt-6 font-display text-5xl leading-none tracking-[-0.04em]">Discover</h1>
        <p className="mt-4 font-body text-base text-muted">
          Recent public lists, searchable by title.
        </p>
        <form action="/discover" className="mt-8 flex flex-wrap gap-3">
          <label className="sr-only" htmlFor="discover-query">
            Search by title
          </label>
          <input
            id="discover-query"
            name="q"
            defaultValue={query ?? ""}
            placeholder="Search titles"
            className={field}
          />
          <button type="submit" className={button}>
            Search
          </button>
        </form>
        {rows.length === 0 ? (
          <p className="mt-10 font-body text-base text-muted">
            {query ? "No public lists match that title." : "No public lists yet."}
          </p>
        ) : (
          <ul className="mt-10 grid gap-4">
            {rows.map((row) => (
              <li key={row.id}>
                <a
                  href={`/l/${row.id}`}
                  className="block border-4 border-line bg-panel p-4 shadow-[8px_8px_0_var(--line)]"
                >
                  <span className="block truncate font-display text-2xl leading-none">
                    {row.title}
                  </span>
                  {row.description ? (
                    <span className="mt-2 block truncate font-body text-sm text-ink">
                      {row.description}
                    </span>
                  ) : null}
                  <span className="mt-2 block font-body text-sm text-muted">
                    {row.author ? `${row.author} · ` : null}
                    Updated{" "}
                    <time dateTime={row.updatedAt.toISOString()}>
                      {updatedFormat.format(row.updatedAt)} UTC
                    </time>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
