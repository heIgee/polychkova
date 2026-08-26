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
| `pnpm check`                  | lint + typecheck — inner loop                      |
| `pnpm verify`                 | check + test coverage + knip — before commit-ready |
| `pnpm lint` / `pnpm lint:fix` | Biome                                              |
| `pnpm test`                   | Vitest                                             |
| `pnpm knip`                   | unused deps/exports                                |

Pre-commit: lefthook fixes staged TypeScript/JSON files with Biome, then typechecks the project.

## Layout

```
app/           Next.js App Router (scaffold pending)
components/    UI (scaffold pending)
lib/           env and current pure logic; later server helpers
e2e/           Playwright (later)
```

## CI

`.github/workflows/ci.yml` — install → check → coverage → knip on `ubuntu-latest`.
