import cloudflare from "@astrojs/cloudflare";
import { defineConfig, fontProviders } from "astro/config";

export default defineConfig({
  site: "https://aka.dog",
  output: "server",
  trailingSlash: "never",
  adapter: cloudflare(),
  // No page uses sessions, and the adapter's default SESSION KV binding has no
  // namespace on preview deploys.
  session: false,
  // Downloaded at build time and served from /_astro/fonts, so a page view
  // never calls out to Google.
  fonts: [
    {
      provider: fontProviders.google(),
      name: "Onest",
      cssVariable: "--font-sans",
      weights: [400, 500, 600],
      styles: ["normal"],
      subsets: ["latin"],
      fallbacks: ["system-ui", "sans-serif"],
    },
    {
      provider: fontProviders.google(),
      name: "Inter Tight",
      cssVariable: "--font-display",
      weights: [700, 800],
      styles: ["normal"],
      subsets: ["latin"],
      fallbacks: ["system-ui", "sans-serif"],
    },
    {
      provider: fontProviders.google(),
      name: "JetBrains Mono",
      cssVariable: "--font-mono",
      weights: [400, 500],
      styles: ["normal"],
      subsets: ["latin"],
      fallbacks: ["ui-monospace", "monospace"],
    },
  ],
});
