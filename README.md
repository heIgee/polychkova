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

No environment variables are required yet. When added, copy `.env.example` to `.env.local` for Next.js. Standalone scripts must load `.env` explicitly. Keep API keys server-only.

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

Pre-commit: lefthook fixes staged TypeScript/JSON files with Biome, then typechecks the project.

## Editor slice

Open `/demo/edit` to try the in-memory tier-list editor. It supports adding items by title with an
optional image URL, editing and deleting items, tier management, drag-and-drop ranking, and a reset
back to the demo seed. Changes are transient until persistence is added.

## Layout

```
app/           Next.js App Router and global styles
components/    reusable UI (as features need it)
lib/           env and current pure logic; later server helpers
e2e/           Playwright (later)
```

## CI

`.github/workflows/ci.yml` — install → check → coverage → knip → build on `ubuntu-latest`.

The homepage links to the editor slice. Product features are planned in [ROADMAP.md](ROADMAP.md)
and will be added in focused increments.
