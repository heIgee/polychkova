# Setup

Stand up Polychkova locally, then point a public host at the same Supabase database. Variable names live in [`.env.example`](.env.example). Copy that file to `.env.local` for Next.js. `pnpm db:migrate` reads `.env.local` when `DIRECT_URL` is not already set in the environment.

Discord and Google accounts with the same email stay separate. Discord does not guarantee a verified email, so sign-in does not link them.

## Supabase Postgres

Create a project at [supabase.com](https://supabase.com). Click **Connect**, then the **Direct** tab.

On that tab, **Transaction pooler** goes in `DATABASE_URL`. **Session pooler** goes in `DIRECT_URL` (same host, port 5432). **Direct connection** is IPv6-only and can fail to resolve. Replace `[YOUR-PASSWORD]` in both. Then apply the migrations once:

```shell
pnpm db:migrate
```

## Auth secret

From the repo root:

```shell
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

Put the output in `AUTH_SECRET`. Use one secret per deployed environment. Changing it signs everyone out.

## Discord

1. Open the [Discord developer portal](https://discord.com/developers/applications) and create an application.
2. Open **OAuth2**.
3. Add a redirect for each origin you serve: `http://localhost:3100/api/auth/callback/discord` and, after deploy, `https://<your-host>/api/auth/callback/discord`.
4. Copy the client ID into `AUTH_DISCORD_ID` and the client secret into `AUTH_DISCORD_SECRET`.

## Google

In [Google Cloud Console](https://console.cloud.google.com), pick or create a project. Open **Google Auth platform**. If it says the platform is not set up, choose **Get started**, name the app, use your email, and choose **External**. While the app is in testing, add your Google account under **Audience → Test users**.

Then open **Clients → Create client → Web application**. Under **Authorized redirect URIs** add `http://localhost:3100/api/auth/callback/google`. Copy the client ID into `AUTH_GOOGLE_ID` and the client secret into `AUTH_GOOGLE_SECRET`.

## Local

Set `AUTH_URL` to `http://localhost:3100`.

```shell
pnpm dev
```

Open [http://localhost:3100/sign-in](http://localhost:3100/sign-in). `/demo/edit` does not need these variables.

## Deploy

There is no hosted project in this repo yet. Any host needs the same variables as `.env.local`, with these differences:

- `AUTH_URL` is the public origin, with no trailing slash, for example `https://example.com`.
- `AUTH_TRUST_HOST=true` so Auth.js accepts the host in front of the app.
- Add the public callback URLs in the Discord and Google clients, as above.
- Run `pnpm db:migrate` against that Supabase `DIRECT_URL` before serving traffic. Boot does not migrate.
- `pnpm build` then `pnpm start` listens on port **3100**.

Keep `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`, and the OAuth client secrets on the server. They are not `NEXT_PUBLIC_*` values.
