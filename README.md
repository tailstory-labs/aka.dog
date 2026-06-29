# aka.dog

Two small systems on one domain, built on **Astro 7** + **Cloudflare Workers Static Assets**:

1. **A redirect shortener** — `aka.dog/{who}/{slug}` → `302` to an external URL, resolved in the
   Worker from build-embedded JSON (`data/redirects/*.json`).
2. **A derived reference index** — `aka.dog/index/*` pages that are *queries* (views) over a single
   hand-authored entry dataset (`data/entries/*.json`). You author **entries**; the views (dump,
   per-provider, `deprecated`, `cloud-microsoft`, `end-user`) are derived — never hand-written.

The seed dataset documents where Microsoft's `*.cloud.microsoft` services live (and what moved
where). The two systems are parallel and only share provider names.

## Architecture

```
Request → Cloudflare
  ├─ /index/**.json, /sitemap.xml, /robots.txt, /_astro/** → static asset from the edge
  ├─ /index, /index/{provider}/{view}                      → Worker → Astro renders HTML
  │                                                           (Accept: application/json → JSON envelope)
  ├─ /{who}/{slug}                                          → Worker → 302 redirect
  └─ anything else                                          → Worker → 404
```

- **Index HTML is server-rendered** (not prerendered) so the Worker can content-negotiate the
  `Accept` header; responses carry `Cache-Control: public, max-age=600` for edge caching. The
  `.json` twins are prerendered static assets.
- **`src/fetch.ts`** is the Astro 7 advanced-routing entry: it resolves redirects, negotiates
  `/index/*`, and falls through to Astro for everything else.
- **One source of truth for the entry shape**: `schema/entry.schema.json` (JSON Schema draft
  2020-12). Validated by ajv in the build gate; TypeScript types are generated from it.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Astro dev server (runs `gen:types` first) |
| `npm run build` | `validate` + `gen:types`, then `astro build` (the build gate) |
| `npm run validate` | ajv structural validation + the 5 semantic checks over `data/entries/*.json` |
| `npm run gen:types` | regenerate `src/lib/types.ts` from the schema |
| `npm run preview` | preview the production build locally |
| `npm run deploy` | `build` then `wrangler deploy` |

To exercise the real Worker locally (redirects, negotiation): `npm run build && npx wrangler dev`.

## Adding data

- **A redirect**: add `"slug": "https://target"` to `data/redirects/{who}.json` (filename = the
  `{who}` namespace). Commit + redeploy.
- **An index entry**: add an object to `data/entries/{provider}.json` following
  `schema/entry.schema.json`. An entry is the durable thing; addresses live under it (`current` /
  `history`). No `current` ⇒ retired. `npm run validate` enforces structure plus: unique `id`,
  `superseded_by` resolves and implies no `current`, every `became` URL resolves, and no
  reserved-word collisions.
- **A focused collection page**: add a record to `COLLECTIONS` in `src/lib/views.ts` (a slug +
  title + description + predicate). No entry changes.

## Deployment (your steps)

The repo is build-ready; deploying needs a Cloudflare account:

1. **Authenticate**: `npx wrangler login` (or set `CLOUDFLARE_API_TOKEN`).
2. **Deploy**: `npm run deploy`. First deploy lands on a `*.workers.dev` subdomain.
3. **Custom domain**: put `aka.dog` on a Cloudflare zone, then add it as a custom domain / route for
   the `aka-dog` Worker (dashboard → Workers → Triggers, or `routes` in `wrangler.jsonc`).

Notes:
- The `@astrojs/cloudflare` adapter auto-enables a **`SESSION` KV namespace** and an **`IMAGES`**
  binding. They're unused here; Cloudflare can auto-provision the KV namespace on deploy, or you can
  remove them later if you want a leaner Worker.
- `not_found_handling` is intentionally **unset** — asset-misses must fall through to the Worker, or
  redirects break. Don't set it to a static page.
- `public/.assetsignore` excludes `_worker.js` / `_routes.json` from asset upload (a known
  Astro-on-Workers 404 snag).
- Changing a link or an entry is a **commit + redeploy** (data is embedded at build; no KV/runtime
  store).

## Layout

```
schema/entry.schema.json     canonical entry contract (draft 2020-12)
scripts/validate-entries.mjs build gate: ajv + semantic checks
data/entries/*.json          the index dataset (authored)
data/redirects/*.json        the shortener dataset (authored)
src/fetch.ts                 redirect resolver + Accept negotiation + Astro fallback
src/lib/                     entries, redirects, views, reserved, types (generated)
src/pages/index/             dump + [...path] views (HTML, server-rendered) and .json twins
src/pages/sitemap.xml.ts     index-only sitemap
```
