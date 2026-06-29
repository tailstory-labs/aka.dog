// filename = the "who"; file body = { "slug": "targetUrl" }
const files = import.meta.glob("../../data/redirects/*.json", {
  import: "default",
  eager: true,
}) as Record<string, Record<string, string>>;

export const redirects = new Map<string, string>(
  Object.entries(files).flatMap(([p, map]) => {
    const who = (p.split("/").pop() ?? "").replace(/\.json$/, "");
    return Object.entries(map).map(
      ([slug, target]) => [`${who}/${slug}`, target] as const,
    );
  }),
);
