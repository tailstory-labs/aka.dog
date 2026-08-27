const files = import.meta.glob("../../data/redirects/*.json", {
  import: "default",
  eager: true,
}) as Record<string, Record<string, string>>;

/** One short link, flattened out of the `{who}.json` file that authored it. */
export interface ShortLink {
  /** The `{who}` namespace - the filename in data/redirects. */
  namespace: string;
  /** May contain slashes: the whole remainder of the path is the key. */
  slug: string;
  /** `${namespace}/${slug}` - exactly the key src/fetch.ts looks up. */
  path: string;
  /** The 302 target, absolute, verbatim as authored. */
  target: string;
}

/**
 * Every short link, sorted by path. Compared with `<`/`>` rather than
 * localeCompare so the row order is a property of the data, not of whatever
 * locale the build machine happens to have.
 */
export const shortLinks: ShortLink[] = Object.entries(files)
  .flatMap(([filePath, redirectMap]) => {
    const namespace = (filePath.split("/").pop() ?? "").replace(/\.json$/, "");
    return Object.entries(redirectMap).map(([slug, target]) => ({
      namespace,
      slug,
      path: `${namespace}/${slug}`,
      target,
    }));
  })
  .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));

/**
 * The Worker's lookup table. Derived from `shortLinks` rather than globbed a
 * second time, so /index/links can never list a link the Worker doesn't serve.
 */
export const redirects = new Map<string, string>(
  shortLinks.map((link) => [link.path, link.target] as const),
);
