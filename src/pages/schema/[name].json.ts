export const prerender = true;

import type { APIRoute } from "astro";

// Mirrors the import.meta.glob pattern in src/lib/redirects.ts. Loads the raw
// bytes of every canonical schema so the build serves them verbatim.
const files = import.meta.glob("../../../schema/*.schema.json", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const byName = new Map(
  Object.entries(files).map(([p, raw]) => [
    (p.split("/").pop() ?? "").replace(/\.schema\.json$/, ""),
    raw,
  ]),
);

export function getStaticPaths() {
  return [...byName.keys()].map((name) => ({ params: { name } }));
}

export const GET: APIRoute = ({ params }) => {
  const raw = byName.get(params.name ?? "");
  if (raw == null) return new Response("Not found", { status: 404 });
  return new Response(raw, {
    headers: { "content-type": "application/schema+json; charset=utf-8" },
  });
};
