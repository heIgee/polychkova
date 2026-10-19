# Polychkova

Tier list app — live URLs, fork, search-to-add.

Planned work: [ROADMAP.md](ROADMAP.md).

## Prerequisites

- Node.js 22+ (see `.node-version`)
- pnpm (see `packageManager` in `package.json`)

## Install

```shell
pnpm install
```

## Env

Copy `.env.example` to `.env.local`. Sign-in and deploy steps are in [AUTH_SETUP.md](AUTH_SETUP.md). `pnpm db:migrate` reads `.env.local` when `DIRECT_URL` is not already set. Keep secrets server-only.

## Scripts

| Command                       | Purpose                                            |
| ----------------------------- | -------------------------------------------------- |
| `pnpm dev`                    | start the Next.js development server on port 3100 |
| `pnpm build`                  | create the production build                       |
| `pnpm start`                  | serve the production build on port 3100           |
| `pnpm check`                  | lint + typecheck — inner loop                      |
| `pnpm verify`                 | check + coverage + knip + build — before commit-ready |
| `pnpm lint` / `pnpm lint:fix` | Biome                                              |
| `pnpm test`                   | Vitest                                             |
| `pnpm knip`                   | unused deps/exports                                |
| `pnpm db:generate`            | write a Drizzle migration from the schema          |
| `pnpm db:migrate`             | apply committed migrations                         |

Pre-commit: lefthook fixes staged TypeScript/JSON files with Biome, then typechecks the project.

## Sign-in

`/sign-in` starts Discord or Google sign-in. The same verified email from either provider is one user. `/account` shows the signed-in user, edits the display name and icon, and signs out.
The session cookie is a JWT. Users and OAuth accounts are stored in Postgres. A provider icon is the URL in `user.image`. An uploaded icon is cropped to a square in the browser, encoded as WebP, and stored as bytes on that same row.

## Editor slice

Open `/demo/edit` to try the tier-list editor without an account. It supports adding items by title
with an optional image URL, editing and deleting items, tier management, drag-and-drop ranking, and
a reset back to the demo seed. Nothing on that page is saved.

## Lists

`/lists` is private to the signed-in user. Each list is one database row: title, description,
visibility, and a single JSON board (`tiers`, `itemsById`, `unrankedItemIds`). Edits autosave.

## Layout

```
app/           Next.js App Router and global styles
components/    reusable UI (as features need it)
lib/           env and current pure logic; later server helpers
e2e/           Playwright (later)
```

## CI

`.github/workflows/ci.yml` runs two jobs on `ubuntu-latest`. `check` is install → check → knip → build, with a dummy `AUTH_SECRET` and no database. `test` boots Postgres, runs `pnpm db:migrate`, then coverage.

The homepage links to the editor. Signed-in users also get My Lists. Product features are planned in [ROADMAP.md](ROADMAP.md)
and will be added in focused increments.
