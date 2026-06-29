import cloudflare from "@astrojs/cloudflare";
import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://aka.dog",
  output: "server",
  trailingSlash: "never",
  adapter: cloudflare(),
});
