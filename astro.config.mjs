import { execSync } from "node:child_process";
import cloudflare from "@astrojs/cloudflare";
import { defineConfig, fontProviders } from "astro/config";

// The commit the site was built from, shown in the header. Workers Builds
// checks out without history often enough that its own variable comes first.
const commitHash = () => {
  const fromBuild = process.env.WORKERS_CI_COMMIT_SHA;
  if (fromBuild) return fromBuild.slice(0, 7);
  try {
    return execSync("git rev-parse --short HEAD", { encoding: "utf-8" }).trim();
  } catch {
    return "unknown";
  }
};

export default defineConfig({
  site: "https://aka.dog",
  output: "server",
  trailingSlash: "never",
  adapter: cloudflare(),
  // No page uses sessions, and the adapter's default SESSION KV binding has no
  // namespace on preview deploys.
  session: false,
  vite: {
    define: {
      __GIT_COMMIT_HASH__: JSON.stringify(commitHash()),
    },
  },
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
