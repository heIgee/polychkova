import type { Metadata } from "next";
import { signIn } from "@/auth";
import { safeNextPath } from "@/lib/site";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to Polychkova with Discord or Google.",
};

const primaryButton =
  "inline-flex h-12 w-full items-center justify-center gap-3 border-4 border-line bg-accent px-5 font-body text-sm font-bold text-accent-ink shadow-[6px_6px_0_var(--line)] transition-transform hover:translate-x-1 hover:translate-y-1 hover:shadow-[4px_4px_0_var(--line)]";

const secondaryButton =
  "inline-flex h-12 w-full items-center justify-center gap-3 border-4 border-line bg-panel px-5 font-body text-sm font-bold text-ink shadow-[6px_6px_0_var(--line)] transition-transform hover:translate-x-1 hover:translate-y-1 hover:shadow-[4px_4px_0_var(--line)]";

function DiscordIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5">
      <path
        fill="currentColor"
        d="M19.27 5.33C17.94 4.71 16.5 4.26 15 4a.1.1 0 0 0-.07.03c-.18.33-.39.76-.53 1.09a16.1 16.1 0 0 0-4.8 0c-.14-.34-.35-.76-.54-1.09c-.01-.02-.04-.03-.07-.03c-1.5.26-2.93.71-4.27 1.33c-.01 0-.02.01-.03.02c-2.72 4.07-3.47 8.03-3.1 11.95c0 .02.01.04.03.05c1.8 1.32 3.53 2.12 5.24 2.65c.03.01.06 0 .07-.02c.4-.55.76-1.13 1.07-1.74c.02-.04 0-.08-.04-.09c-.57-.22-1.11-.48-1.64-.78c-.04-.02-.04-.08-.01-.11c.11-.08.22-.17.33-.25c.02-.02.05-.02.07-.01c3.44 1.57 7.15 1.57 10.55 0c.02-.01.05-.01.07.01c.11.09.22.17.33.26c.04.03.04.09-.01.11c-.52.31-1.07.56-1.64.78c-.04.01-.05.06-.04.09c.32.61.68 1.19 1.07 1.74c.03.01.06.02.09.01c1.72-.53 3.45-1.33 5.25-2.65c.02-.01.03-.03.03-.05c.44-4.53-.73-8.46-3.1-11.95c-.01-.01-.02-.02-.04-.02M8.52 14.91c-1.03 0-1.89-.95-1.89-2.12s.84-2.12 1.89-2.12c1.06 0 1.9.96 1.89 2.12c0 1.17-.84 2.12-1.89 2.12m6.97 0c-1.03 0-1.89-.95-1.89-2.12s.84-2.12 1.89-2.12c1.06 0 1.9.96 1.89 2.12c0 1.17-.83 2.12-1.89 2.12"
      />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5">
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.54-5.17 3.54-8.87"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.76-2.11-6.7-4.94H1.29v3.09A12 12 0 0 0 12 24"
      />
      <path
        fill="#FBBC05"
        d="M5.3 14.31A7.2 7.2 0 0 1 4.92 12c0-.8.14-1.58.38-2.31V6.6H1.29A12 12 0 0 0 0 12c0 1.94.46 3.77 1.29 5.4z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.76 0 3.34.6 4.58 1.79l3.44-3.44C17.94 1.14 15.24 0 12 0 7.31 0 3.26 2.69 1.29 6.6l4.01 3.09C6.24 6.86 8.88 4.75 12 4.75"
      />
    </svg>
  );
}

const signInErrors: Record<string, string> = {
  OAuthAccountNotLinked: "That email is already used by the other sign-in method.",
  AccessDenied: "Sign-in was cancelled.",
  Configuration: "Sign-in is misconfigured.",
  OAuthSignin: "Could not start sign-in. Try again.",
  OAuthCallbackError: "The provider rejected the sign-in. Try again.",
  Default: "Sign-in failed. Try again.",
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;
  const redirectTo = safeNextPath(next);
  const message = error ? (signInErrors[error] ?? signInErrors.Default) : null;

  return (
    <main className="min-h-screen bg-paper text-ink">
      <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-16">
        <a
          href="/"
          className="font-body text-xs font-bold uppercase tracking-[0.2em] text-muted underline-offset-4 hover:underline"
        >
          ← Polychkova
        </a>
        <h1 className="mt-6 font-display text-5xl leading-none tracking-[-0.04em]">Sign in</h1>
        <p className="mt-4 font-body text-lg leading-7 text-muted">
          Use Discord or Google. Lists you create later stay on this account.
        </p>
        {message ? (
          <p className="mt-6 border-4 border-line bg-panel px-4 py-3 font-body text-sm font-bold text-ink">
            {message}
          </p>
        ) : null}
        <div className="mt-8 grid gap-4">
          <form
            action={async () => {
              "use server";
              await signIn("discord", { redirectTo });
            }}
          >
            <button type="submit" className={primaryButton}>
              <DiscordIcon />
              Continue with Discord
            </button>
          </form>
          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo });
            }}
          >
            <button type="submit" className={secondaryButton}>
              <GoogleIcon />
              Continue with Google
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
