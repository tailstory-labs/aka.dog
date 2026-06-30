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
  Object.entries(files).map(([filePath, rawContent]) => [
    (filePath.split("/").pop() ?? "").replace(/\.schema\.json$/, ""),
    rawContent,
  ]),
);

export function getStaticPaths() {
  return [...byName.keys()].map((name) => ({ params: { name } }));
}

export const GET: APIRoute = ({ params }) => {
  const rawContent = byName.get(params.name ?? "");
  if (rawContent == null) return new Response("Not found", { status: 404 });
  return new Response(rawContent, {
    headers: { "content-type": "application/schema+json; charset=utf-8" },
  });
};
