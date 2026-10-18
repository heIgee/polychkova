import { DrizzleAdapter } from "@auth/drizzle-adapter";
import NextAuth from "next-auth";
import Discord, { type DiscordProfile } from "next-auth/providers/discord";
import Google from "next-auth/providers/google";
import { lazyDb } from "@/lib/db/client";
import { accounts, users } from "@/lib/db/schema";

const defaultDiscordProfile = Discord({}).profile;
if (!defaultDiscordProfile) {
  throw new Error("Discord provider is missing a profile mapper");
}
const discordProfile = defaultDiscordProfile;

async function discordUser(profile: DiscordProfile, tokens: Parameters<typeof discordProfile>[1]) {
  const user = await discordProfile(profile, tokens);
  // Discord can return an unverified email. Only a verified one may join an existing user.
  return profile.verified ? user : { ...user, email: null };
}

export const { handlers, auth, signIn, signOut, unstable_update } = NextAuth(() => ({
  adapter: DrizzleAdapter(lazyDb(), {
    usersTable: users,
    accountsTable: accounts,
  }),
  session: { strategy: "jwt" },
  pages: { signIn: "/sign-in" },
  providers: [
    // Discord now returns iss=https://discord.com. With no issuer, Auth.js expects https://authjs.dev and rejects the callback.
    Discord({
      issuer: "https://discord.com",
      allowDangerousEmailAccountLinking: true,
      profile: discordUser,
    }),
    Google({ allowDangerousEmailAccountLinking: true }),
  ],
  callbacks: {
    authorized({ auth: session }) {
      return !!session?.user;
    },
    jwt({ token, user, trigger, session }) {
      if (user?.id) {
        token.sub = user.id;
      }
      if (trigger === "update" && session?.user) {
        if (session.user.name) {
          token.name = session.user.name;
        }
        if (session.user.image) {
          token.picture = session.user.image;
        }
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
}));

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}
