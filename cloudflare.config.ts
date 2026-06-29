import { bindings, defineWorker } from "wrangler/experimental-config";

export default defineWorker({
  name: "aka-dog",
  compatibilityDate: "2026-06-01",
  compatibilityFlags: [],
  domains: ["aka.dog"],
  previewUrls: true,
  entrypoint: "./dist/server/entry.mjs",
  assets: {
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
