import type { CuratedPage } from "@/lib/curated-types";

// data/curated/{provider}/{slug}.json - the directory is the provider and the
// filename is the view slug, so neither has to be restated inside the file.
const files = import.meta.glob("../../data/curated/*/*.json", {
  import: "default",
  eager: true,
}) as Record<string, CuratedPage>;

export interface CuratedPageDoc extends CuratedPage {
  provider: string;
  slug: string;
}

export const curatedPages: CuratedPageDoc[] = Object.entries(files).map(
  ([filePath, page]) => {
    const segments = filePath.split("/");
    const slug = (segments.pop() ?? "").replace(/\.json$/, "");
    const provider = segments.pop() ?? "";
    return { ...page, provider, slug };
  },
);

export const findCuratedPage = (
  provider: string,
  slug: string,
): CuratedPageDoc | undefined =>
  curatedPages.find((page) => page.provider === provider && page.slug === slug);

export const curatedPagesFor = (
  provider: string,
): { slug: string; title: string }[] =>
  curatedPages
    .filter((page) => page.provider === provider)
    .map((page) => ({ slug: page.slug, title: page.title }));
