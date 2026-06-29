# AGENTS.md

Guidance for AI coding agents working in this repo. For the full contributor guide (architecture,
deployment, layout) see [CONTRIBUTING.md](CONTRIBUTING.md).

## What this is

Two parallel systems on one domain (Astro 7 + Cloudflare Workers Static Assets):

1. **Redirect shortener** — `aka.dog/{who}/{slug}` → `302`, resolved in the Worker from
   `data/redirects/*.json`.
2. **Derived reference index** — `aka.dog/index/*` views are *queries* over `data/entries/*.json`.
   Author **entries** only; the views (dump, per-provider, `deprecated`, `cloud-microsoft`,
   `end-user`) are derived — never hand-write them.

## Commands

- `npm run build` — the build gate: `validate` + `gen:types`, then `astro build`. Run before
  considering work done.
- `npm run validate` — ajv structural validation + 5 semantic checks over `data/entries/*.json`.
- `npm run gen:types` — regenerate `src/lib/types.ts` from `schema/entry.schema.json`.
- `npm run dev` — Astro dev server.
- `npm run cf:dev` — run the real Worker locally (redirects + content negotiation).
- `npx biome check --write .` — format and lint (always run before committing).

## Conventions & invariants

- **Single source of truth for the entry shape**: `schema/entry.schema.json` (JSON Schema draft
  2020-12). `src/lib/types.ts` is **generated** — never edit it by hand; change the schema and run
  `gen:types`.
- **Don't author derived views.** Add data, not view output.
- **Validation must pass.** `npm run validate` enforces: unique `id`, `superseded_by` resolves and
  implies no `current`, every `became` URL resolves, and no reserved-word collisions.
- **Formatting**: Biome — 2-space indent, double quotes, organized imports. CI runs `biome ci .` on
  every push to `main` and every PR.
- **No `wrangler.jsonc`.** Worker config is the experimental TypeScript config
  (`cloudflare.config.ts` + `wrangler.config.ts`, deployed with `--x-new-config`).
- **`notFoundHandling` stays unset** — asset-misses must fall through to the Worker or redirects
  break.
- Data is embedded at build time (no KV/runtime store), so any data change is a **commit + redeploy**.

## Where things live

```
schema/entry.schema.json     canonical entry contract
scripts/validate-entries.mjs build gate: ajv + semantic checks
data/entries/*.json          index dataset (authored)
data/redirects/*.json        shortener dataset (authored)
src/fetch.ts                 redirect resolver + Accept negotiation + Astro fallback
src/lib/                     entries, redirects, views, reserved, types (generated)
src/pages/index/             dump + [...path] views and .json twins
```
