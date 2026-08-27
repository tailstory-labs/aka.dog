# Contributing to aka.dog

aka.dog is two small systems on one domain, built on **Astro 7** + **Cloudflare Workers Static
Assets**:

1. **A redirect shortener** - `aka.dog/{who}/{slug}` -> `302` to an external URL, resolved in the
   Worker from build-embedded JSON (`data/redirects/*.json`).
2. **A derived reference index** - `aka.dog/index/*` pages that are *queries* (views) over a
   hand-authored entry dataset (`data/entries/*.json`), plus **curated pages** assembled from a
   second dataset (`data/curated/{provider}/{slug}.json`). You author data; the pages are derived
   from it - never hand-written. A curated page supplies ordering, grouping and audience-specific
   wording, and references entries by `id` so it never restates an address.

The dataset is organized by namespace (provider), so any vendor can be added as a new namespace. The
two systems are parallel and only share provider names.

## Architecture

```
Request -> Cloudflare
  |- /index/**.json, /sitemap.xml, /robots.txt, /_astro/** -> static asset from the edge
  |- /index, /index/{provider}/{view}                      -> Worker -> Astro renders HTML
  |                                                           (Accept: application/json -> JSON envelope)
  |- /introspect/{link}                                    -> Worker -> Astro renders HTML
  |                                                           (Accept: application/json -> JSON envelope)
  |- /{who}/{slug}                                         -> Worker -> 302 redirect
  \- anything else                                         -> Worker -> 404
```

- **Index HTML is server-rendered** (not prerendered) so the Worker can content-negotiate the
  `Accept` header; responses carry `Cache-Control: public, max-age=600`. The `.json` twins are
  prerendered static assets.
- **`src/fetch.ts`** is the Astro 7 advanced-routing entry: it resolves redirects, negotiates
  `/index/*`, and falls through to Astro for everything else.
- **One source of truth per shape**: `schemas/entry.schema.json` for entries and
  `schemas/curated.schema.json` for curated pages (JSON Schema draft 2020-12). Both are validated
  by ajv in the build gate, and TypeScript types are generated from them.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Astro dev server (runs `generate:types` first) |
| `npm run build` | `validate` + `generate:types`, then `astro build` (the build gate) |
| `npm run validate` | ajv + semantic checks over `data/entries/*.json` and `data/curated/**/*.json` |
| `npm run generate:types` | regenerate `src/lib/types.ts` and `src/lib/curated-types.ts` from the schemas |
| `npm run preview` | preview the production build locally |
| `npm run cloudflare:dev` | `build` then run the real Worker locally (`wrangler dev --x-new-config`) |
| `npm run deploy` | `build` then `wrangler deploy --x-new-config` |

To exercise the real Worker locally (redirects, negotiation): `npm run cloudflare:dev`.

## Formatting & linting

[Biome](https://biomejs.dev) handles formatting and linting (config in `biome.json`: 2-space
indent, double quotes, organized imports, recommended lint rules). Run `npx biome check --write .`
to format and fix locally; CI runs `biome ci .` on every push to `main` and every pull request
(`.github/workflows/biome.yaml`).

## Adding data

- **A redirect**: add `"slug": "https://target"` to `data/redirects/{who}.json` (filename = the
  `{who}` namespace). Commit + redeploy.
- **An index entry**: add an object to `data/entries/{provider}.json` following
  `schemas/entry.schema.json`. An entry is the durable thing; addresses live under it (`current` /
  `history`). No `current` => retired. `npm run validate` enforces structure plus: unique `id`,
  `superseded_by` resolves and implies no `current`, every `became` URL resolves, and no
  reserved-word collisions. A `history` address is only ever printed on the deprecated views
  (`/index/deprecated`, `/index/{provider}/deprecated`) and on `/introspect/{link}`, where the dead
  address is the lookup itself - elsewhere a retired entry shows the `retired` chip and an em dash,
  and the page links to the deprecated view.
- **A focused collection page**: add a record to `COLLECTIONS` in `src/lib/views.ts` (a slug +
  title + description + predicate). No entry changes. This is the right tool when the page *is* a
  query - "every `*.cloud.microsoft` host" is a fact about the entries.
- **A hand-curated page**: add `data/curated/{provider}/{slug}.json` - the directory is the
  provider and the filename is the view slug, so `/index/{provider}/{slug}` starts serving. Use
  this when the page is editorial: ordering, grouping and wording aimed at a particular reader, of
  the kind no predicate over `data/entries` could produce. Items reference an entry by `id`
  (`{ "entry": "outlook", "label": "Outlook", "blurb": "Email" }`) and the address is resolved from
  it, so the page follows any future host move; an inline `{ "name", "url", "blurb" }` item is the
  escape hatch for a link not worth an index entry. `blurb` is capped at 64 characters and `label`
  at 32 - that cap is what keeps a curated page from going ragged, so don't raise it. A curated
  page shadows a same-slug entry in `COLLECTIONS`. Store `title` **bare** (`"end-user
  surfaces"`, not `"microsoft: end-user surfaces"`) - the resolver prefixes the provider, so the
  same string serves both the page heading and the homepage nav label.

## Reporting a stale link

Spotted a moved or dead link but don't want to edit JSON? File an issue at
[issues/new/choose](https://github.com/tailstory-labs/aka.dog/issues/new/choose) - there's a form
for index addresses and one for redirects. The forms ask for the evidence a maintainer needs
(a Message Center ID, a doc link, or just what you saw), so the fix can land without a round trip.

## Worker config

Deployment uses Wrangler's experimental TypeScript config (`--x-new-config`) - there is **no
`wrangler.jsonc`**:

- **`cloudflare.config.ts`** (`defineWorker`) - runtime settings: name, compatibility date, custom
  `domains`, the `ASSETS`/`SESSION`/`IMAGES` bindings, `assets.htmlHandling`, and observability.
  aka.dog uses the `@astrojs/cloudflare` **server** adapter, so `entrypoint` points at the worker
  the adapter emits at `dist/server/entry.mjs` - `astro build` must run first (the `deploy`/`cloudflare:dev`
  scripts do this).
- **`wrangler.config.ts`** (`defineWranglerConfig`) - tooling: `assetsDirectory: "./dist/client"`
  (the adapter's static-asset output).

## Deployment

The repo is build-ready; deploying needs a Cloudflare account:

1. **Authenticate**: `npx wrangler login` (or set `CLOUDFLARE_API_TOKEN`).
2. **Deploy**: `npm run deploy` (`astro build` then `wrangler deploy --x-new-config`). With
   `previewUrls: true` you also get a `*.workers.dev` preview URL.
3. **Custom domain**: `aka.dog` is declared in `cloudflare.config.ts` (`domains`), so once the zone
   exists on your Cloudflare account the deploy attaches it.

Notes:
- The `@astrojs/cloudflare` adapter requires the **`SESSION` KV namespace** and **`IMAGES`**
  bindings (declared in `cloudflare.config.ts`). They're unused here; Cloudflare can auto-provision
  the KV namespace on deploy.
- `notFoundHandling` is intentionally **unset** - asset-misses must fall through to the Worker, or
  redirects break. Don't set it to a static page.
- `public/.assetsignore` excludes `_worker.js` / `_routes.json` from asset upload (a known
  Astro-on-Workers 404 snag).
- Changing a link or an entry is a **commit + redeploy** (data is embedded at build; no KV/runtime
  store).

## Layout

```
schemas/entry.schema.json     canonical entry contract (draft 2020-12)
schemas/curated.schema.json   canonical curated-page contract (draft 2020-12)
scripts/validate-entries.mjs build gate: ajv + semantic checks over entries
scripts/validate-curated.mjs build gate: ajv + entry-reference checks over curated pages
data/entries/*.json          the index dataset (authored)
data/redirects/*.json        the shortener dataset (authored)
data/curated/{provider}/     curated pages (authored) - one {slug}.json per page
src/fetch.ts                 redirect resolver + Accept negotiation + Astro fallback
src/lib/                     entries, redirects, curated, views, introspect, reserved, types (generated)
src/components/              EntryTable, DeprecationTable, CuratedGroups, TableFilter, AddressFacts
src/pages/index/             dump + [...path] views (HTML, server-rendered) and .json twins
src/pages/introspect/        [...link] lookup over both datasets (server-rendered) and its .json twin
src/pages/sitemap.xml.ts     index-only sitemap
```
