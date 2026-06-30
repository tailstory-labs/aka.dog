import { entries } from "@/lib/entries";
import { RESERVED_VIEW } from "@/lib/reserved";
import type { Entry } from "@/lib/types";

const host = (url: string) => url.split("/")[0];
const isRetired = (entry: Entry) => !entry.current?.length;

export interface Collection {
  slug: string;
  title: string;
  description: string;
  match: (entry: Entry) => boolean;
}

export const COLLECTIONS: Collection[] = [
  {
    slug: "cloud-microsoft",
    title: "cloud.microsoft endpoints",
    description: "Current *.cloud.microsoft hosts.",
    match: (entry) =>
      (entry.current ?? []).some((address) =>
        /\.cloud\.microsoft$/.test(host(address.url)),
      ),
  },
  {
    slug: "end-user",
    title: "End-user surfaces",
    description: "Endpoints users hit directly, like myapps and mygroups.",
    match: (entry) => (entry.tags ?? []).includes("end-user"),
  },
].filter((collection) => !RESERVED_VIEW.has(collection.slug));

export const providers = (): string[] => [
  ...new Set(entries.map((entry) => entry.provider)),
];

export interface ProviderNav {
  provider: string;
  collections: { slug: string; title: string }[];
}

export function providerNav(): ProviderNav[] {
  return providers().map((provider) => ({
    provider,
    collections: COLLECTIONS.filter((collection) =>
      entries.some(
        (entry) => entry.provider === provider && collection.match(entry),
      ),
    ).map((collection) => ({ slug: collection.slug, title: collection.title })),
  }));
}

export function indexViewPaths(): string[] {
  const paths = ["deprecated"];
  for (const provider of providers()) {
    paths.push(provider, `${provider}/deprecated`);
    for (const collection of COLLECTIONS) {
      if (
        entries.some(
          (entry) => entry.provider === provider && collection.match(entry),
        )
      )
        paths.push(`${provider}/${collection.slug}`);
    }
  }
  return paths;
}

const deprecatedSet = (list: Entry[]) =>
  list.filter((entry) => isRetired(entry) || (entry.history?.length ?? 0) > 0);

export interface ResolvedView {
  title: string;
  description: string;
  kind: "entries" | "deprecated";
  entries: Entry[];
}

export function resolveViewByPath(segments: string[]): ResolvedView {
  if (segments.length === 0)
    return {
      title: "aka.dog index",
      description: "Everything tracked here.",
      kind: "entries",
      entries,
    };

  if (segments.length === 1 && segments[0] === "deprecated")
    return {
      title: "Deprecated",
      description: "Link histories across all providers.",
      kind: "deprecated",
      entries: deprecatedSet(entries),
    };

  const [provider, view] = segments;
  const scopedEntries = entries.filter((entry) => entry.provider === provider);

  if (!view)
    return {
      title: provider,
      description: `Everything under ${provider}.`,
      kind: "entries",
      entries: scopedEntries,
    };

  if (view === "deprecated")
    return {
      title: `${provider}: deprecated`,
      description: `Link histories for ${provider}.`,
      kind: "deprecated",
      entries: deprecatedSet(scopedEntries),
    };

  const collection = COLLECTIONS.find((candidate) => candidate.slug === view);
  if (collection)
    return {
      title: `${provider}: ${collection.title}`,
      description: collection.description,
      kind: "entries",
      entries: scopedEntries.filter(collection.match),
    };

  throw new Error(`Unknown view: ${segments.join("/")}`);
}

export interface DeprecationRow {
  entry: Entry;
  url: string;
  until?: string;
  became?: string;
  retired: boolean;
}
export function deprecationRows(list: Entry[]): DeprecationRow[] {
  return list.flatMap((entry) => {
    const retired = isRetired(entry);
    const rows = (entry.history ?? []).map((historyEntry) => ({
      entry,
      url: historyEntry.url,
      until: historyEntry.until,
      became: historyEntry.became,
      retired,
    }));
    return rows.length
      ? rows
      : retired
        ? [{ entry, url: "(no live address)", retired }]
        : [];
  });
}

export function buildEnvelope(view: string, list: Entry[]) {
  return {
    schema: "https://aka.dog/schemas/entry.json",
    version: 1,
    view,
    generated: new Date().toISOString(),
    entries: list,
  };
}
