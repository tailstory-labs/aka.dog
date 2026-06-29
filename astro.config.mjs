import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  site: 'https://aka.dog',
  output: 'server', // index routes opt back into static with `export const prerender = true`
  adapter: cloudflare(),
  // compressHTML defaults to 'jsx' in Astro 7 — use {" "} for literal inline spacing
});
