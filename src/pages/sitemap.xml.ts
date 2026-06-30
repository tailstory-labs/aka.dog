export const prerender = true;

import type { APIRoute } from "astro";
import { entries } from "@/lib/entries";
import { indexViewPaths, resolveViewByPath } from "@/lib/views";

const latestModified = (list: { last_verified?: string }[]) =>
  list
    .map((entry) => entry.last_verified)
    .filter(Boolean)
    .sort()
    .pop();

export const GET: APIRoute = ({ site }) => {
  if (!site) throw new Error("Astro `site` must be configured");
  const base = site.toString().replace(/\/$/, "");
  const urls = [
    { location: `${base}/`, lastModified: latestModified(entries) },
    { location: `${base}/index`, lastModified: latestModified(entries) },
    ...indexViewPaths().map((viewPath) => ({
      location: `${base}/index/${viewPath}`,
      lastModified: latestModified(
        resolveViewByPath(viewPath.split("/")).entries,
      ),
    })),
  ];
  const body =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls
      .map(
        (url) =>
          `  <url><loc>${url.location}</loc>${url.lastModified ? `<lastmod>${url.lastModified}</lastmod>` : ""}</url>`,
      )
      .join("\n") +
    `\n</urlset>\n`;
  return new Response(body, { headers: { "content-type": "application/xml" } });
};
