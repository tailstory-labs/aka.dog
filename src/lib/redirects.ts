const files = import.meta.glob("../../data/redirects/*.json", {
  import: "default",
  eager: true,
}) as Record<string, Record<string, string>>;

export const redirects = new Map<string, string>(
  Object.entries(files).flatMap(([filePath, redirectMap]) => {
    const who = (filePath.split("/").pop() ?? "").replace(/\.json$/, "");
    return Object.entries(redirectMap).map(
      ([slug, target]) => [`${who}/${slug}`, target] as const,
    );
  }),
);
