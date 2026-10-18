import { eq, sql } from "drizzle-orm";
import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { SquareImageField } from "@/components/square-image-field";
import { getDb } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { saveProfile } from "./actions";

export const metadata: Metadata = {
  title: "Account",
  description: "Your Polychkova account.",
};

const field =
  "mt-2 h-12 w-full border-4 border-line bg-paper px-3 font-body text-sm text-ink outline-none";

const button =
  "inline-flex h-12 items-center justify-center border-4 border-line bg-accent px-5 font-body text-sm font-bold text-accent-ink shadow-[6px_6px_0_var(--line)] transition-transform hover:translate-x-1 hover:translate-y-1 hover:shadow-[4px_4px_0_var(--line)]";

const signOutButton =
  "inline-flex h-12 items-center justify-center border-4 border-line bg-panel px-5 font-body text-sm font-bold text-ink shadow-[6px_6px_0_var(--line)] transition-transform hover:translate-x-1 hover:translate-y-1 hover:shadow-[4px_4px_0_var(--line)]";

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    redirect("/sign-in");
  }

  const { error } = await searchParams;
  const message =
    error === "Name is required." ||
    error === "Name must be 32 characters or fewer." ||
    error === "Icon must be 512 KB or smaller." ||
    error === "Icon must be a PNG, JPEG, GIF, or WebP."
      ? error
      : null;
  const [row] = await getDb()
    .select({
      name: users.name,
      email: users.email,
      image: users.image,
      hasAvatar: sql<number>`coalesce(octet_length(${users.avatar}), 0)`.mapWith(Number),
    })
    .from(users)
    .where(eq(users.id, userId));
  if (!row) {
    redirect("/sign-in");
  }

  const name = row.name ?? "";
  const image = row.hasAvatar > 0 ? `/api/account/avatar?v=${Date.now()}` : row.image;

  return (
    <main className="min-h-screen bg-paper text-ink">
      <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-16">
        <a
          href="/"
          className="font-body text-xs font-bold uppercase tracking-[0.2em] text-muted underline-offset-4 hover:underline"
        >
          ← Polychkova
        </a>
        <h1 className="mt-6 font-display text-5xl leading-none tracking-[-0.04em]">Account</h1>
        <div className="mt-8 flex items-center gap-4 border-4 border-line bg-panel p-4 shadow-[8px_8px_0_var(--line)]">
          {image ? (
            row.hasAvatar > 0 ? (
              // The uploaded icon is served by our route, not a static file next/image can optimize.
              // biome-ignore lint/performance/noImgElement: same-origin avatar bytes
              <img src={image} alt="" className="size-20 border border-line object-cover" />
            ) : (
              <Image
                src={image}
                alt=""
                width={80}
                height={80}
                className="size-20 border border-line object-cover"
              />
            )
          ) : (
            <div className="flex size-20 items-center justify-center bg-accent font-display text-2xl text-accent-ink">
              {(name || row.email || "?").slice(0, 1).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate font-display text-2xl leading-none">{name || "Signed in"}</p>
            {row.email ? (
              <p className="mt-2 truncate font-body text-sm text-muted">{row.email}</p>
            ) : null}
          </div>
        </div>
        <form action={saveProfile} className="mt-8 grid gap-4">
          <label className="font-body text-xs font-bold uppercase tracking-[0.2em] text-muted">
            Name
            <input name="name" defaultValue={name} maxLength={32} required className={field} />
          </label>
          <SquareImageField name="icon" />
          {message ? <p className="font-body text-sm font-bold text-ink">{message}</p> : null}
          <button type="submit" className={button}>
            Save
          </button>
        </form>
        <form
          className="mt-4"
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/" });
          }}
        >
          <button type="submit" className={signOutButton}>
            Sign out
          </button>
        </form>
      </div>
    </main>
  );
}
