# AGENTS.md

Guidance for AI coding agents working in this repo. For the full contributor guide (architecture,
deployment, layout) see [CONTRIBUTING.md](CONTRIBUTING.md).

## What this is

Two parallel systems on one domain (Astro 7 + Cloudflare Workers Static Assets):

1. **Redirect shortener** - `aka.dog/{who}/{slug}` -> `302`, resolved in the Worker from
   `data/redirects/*.json`.
2. **Derived reference index** - `aka.dog/index/*` views are *queries* over `data/entries/*.json`
   (the dump, per-provider, `deprecated` and `cloud-microsoft` views), plus **curated pages**
   assembled from `data/curated/{provider}/{slug}.json` (today: `microsoft/end-user`). Author
   data, never view output.

## Commands

- `npm run build` - the build gate: `validate` + `gen:types`, then `astro build`. Run before
  considering work done.
- `npm run validate` - ajv + semantic checks over `data/entries/*.json` and
  `data/curated/**/*.json`.
- `npm run gen:types` - regenerate `src/lib/types.ts` and `src/lib/curated-types.ts` from
  `schemas/*.schema.json`.
- `npm run dev` - Astro dev server.
- `npm run cf:dev` - run the real Worker locally (redirects + content negotiation).
- `npx biome check --write .` - format and lint (always run before committing).

## Conventions & invariants

- **Single source of truth for the entry shape**: `schemas/entry.schema.json` (draft 2020-12);
  for curated pages, `schemas/curated.schema.json`. `src/lib/types.ts` and
  `src/lib/curated-types.ts` are **generated** - never hand-edit; change the schema and run
  `gen:types`.
- **Don't author derived views.** Add data, not view output. There are three authored datasets:
  `data/entries/*.json` (facts - services and the addresses they live at), `data/redirects/*.json`
  (the shortener), and `data/curated/{provider}/{slug}.json` (editorial - ordering, grouping, and
  audience-specific wording). A curated page references entries by `id` and **never restates a
  URL**, so when an address moves in `data/entries` every curated page follows. Never hard-code a
  destination URL in an `.astro` file. A curated item's `blurb` is written for that page's audience;
  it is not `entry.description` and must never fall back to it.
- **A curated page shadows a same-slug collection.** `data/curated/microsoft/end-user.json` is why
  `/index/microsoft/end-user` is grouped rather than tag-filtered. The `end-user` COLLECTION still
  exists and still answers for any provider without a curated file. This is deliberate.
- **Validation must pass.** `npm run validate` enforces, over entries: unique `id`, `superseded_by`
  resolves and implies no `current`, every `became` URL resolves, and no reserved-word collisions.
  Over curated pages: the directory is a real provider, the slug is free and well-formed, every
  referenced entry exists, belongs to that provider, has a `current` address, and appears once.
- **Formatting**: Biome - 2-space indent, double quotes, organized imports. CI runs `biome ci .` on
  every push to `main` and every PR.
- **No `wrangler.jsonc`.** Worker config is the experimental TypeScript config
  (`cloudflare.config.ts` + `wrangler.config.ts`, deployed with `--x-new-config`).
- **`notFoundHandling` stays unset** - asset-misses must fall through to the Worker or redirects
  break.
- Data is embedded at build (no KV/runtime store), so any data change is a **commit + redeploy**.

## Where things live

```
schemas/entry.schema.json     canonical entry contract
schemas/curated.schema.json   canonical curated-page contract
scripts/validate-entries.mjs build gate: ajv + semantic checks over entries
scripts/validate-curated.mjs build gate: ajv + entry-reference checks over curated pages
data/entries/*.json          index dataset (authored)
data/redirects/*.json        shortener dataset (authored)
data/curated/{provider}/     curated pages (authored) - {slug}.json per page
src/fetch.ts                 redirect resolver + Accept negotiation + Astro fallback
src/lib/                     entries, redirects, curated, views, reserved, types (generated)
src/components/              EntryTable, DeprecationTable, CuratedGroups, TableFilter
src/pages/index/             dump + [...path] views and .json twins
```
