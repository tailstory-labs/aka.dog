export const prerender = true;

import type { APIRoute } from "astro";
import { entries } from "../lib/entries";
import { indexViewPaths, resolveViewByPath } from "../lib/views";

const lastmod = (list: { last_verified?: string }[]) =>
  list
    .map((e) => e.last_verified)
    .filter(Boolean)
    .sort()
    .pop();

export const GET: APIRoute = ({ site }) => {
  if (!site) throw new Error("Astro `site` must be configured");
  const base = site.toString().replace(/\/$/, "");
  const urls = [
    { loc: `${base}/`, mod: lastmod(entries) },
    { loc: `${base}/index`, mod: lastmod(entries) },
    ...indexViewPaths().map((p) => ({
      loc: `${base}/index/${p}`,
      mod: lastmod(resolveViewByPath(p.split("/")).entries),
    })),
  ];
  const body =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls
      .map(
        (u) =>
          `  <url><loc>${u.loc}</loc>${u.mod ? `<lastmod>${u.mod}</lastmod>` : ""}</url>`,
      )
      .join("\n") +
    `\n</urlset>\n`;
  return new Response(body, { headers: { "content-type": "application/xml" } });
};
