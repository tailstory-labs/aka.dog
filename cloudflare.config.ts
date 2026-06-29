import { bindings, defineWorker } from "wrangler/experimental-config";

// Experimental TypeScript Worker config (wrangler --x-new-config), mirroring the approach in
// shenanigansd/shenanigans.dog#132. Runtime settings live here; the assets directory lives in
// wrangler.config.ts.
//
// Unlike a pure-static site, aka.dog uses the @astrojs/cloudflare server adapter, so `entrypoint`
// points at the worker the adapter emits under dist/server (run `astro build` first — the deploy
// script does). The adapter requires the ASSETS / SESSION / IMAGES bindings, declared in `env`.
export default defineWorker({
  name: "aka-dog",
  compatibilityDate: "2026-06-01",
  compatibilityFlags: [],
  domains: ["aka.dog"],
  previewUrls: true,
  entrypoint: "./dist/server/entry.mjs",
  assets: {
    // drop-trailing-slash keeps /index, /index/{provider}/{view} canonical (no redirect hop);
    // notFoundHandling is intentionally left unset so asset-misses fall through to the Worker.
    htmlHandling: "drop-trailing-slash",
  },
  env: {
    ASSETS: bindings.assets(),
    SESSION: bindings.kv(),
    IMAGES: bindings.images(),
  },
  observability: {
    enabled: true,
  },
});
