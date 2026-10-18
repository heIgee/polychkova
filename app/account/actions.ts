"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth, unstable_update } from "@/auth";
import { parseProfileUpdate } from "@/lib/account-profile";
import { getDb } from "@/lib/db/client";
import { users } from "@/lib/db/schema";

export async function saveProfile(formData: FormData) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    redirect("/sign-in");
  }

  const name = String(formData.get("name") ?? "");
  const file = formData.get("icon");
  const upload =
    file instanceof File && file.size > 0
      ? { bytes: new Uint8Array(await file.arrayBuffer()) }
      : null;
  const parsed = parseProfileUpdate(name, upload);
  if (!parsed.ok) {
    redirect(`/account?error=${encodeURIComponent(parsed.error)}`);
  }

  await getDb()
    .update(users)
    .set({
      name: parsed.name,
      ...(parsed.avatar
        ? { avatar: Buffer.from(parsed.avatar.bytes), avatarType: parsed.avatar.type }
        : {}),
    })
    .where(eq(users.id, userId));

  await unstable_update({
    user: {
      name: parsed.name,
      ...(parsed.avatar ? { image: "/api/account/avatar" } : {}),
    },
  });
  redirect("/account");
}
