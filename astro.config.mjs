import cloudflare from "@astrojs/cloudflare";
import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://aka.dog",
  output: "server", // index routes opt back into static with `export const prerender = true`
  trailingSlash: "never", // aligns canonical/sitemap URLs with the Worker's drop-trailing-slash asset routing
  adapter: cloudflare(),
  // compressHTML defaults to 'jsx' in Astro 7 — use {" "} for literal inline spacing
});
