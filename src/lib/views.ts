import { entries } from "@/lib/entries";
import { RESERVED_VIEW } from "@/lib/reserved";
import type { Entry } from "@/lib/types";

const host = (url: string) => url.split("/")[0];
const isRetired = (e: Entry) => !e.current?.length;

export interface Collection {
  slug: string;
  title: string;
  description: string;
  match: (e: Entry) => boolean;
}

export const COLLECTIONS: Collection[] = [
  {
    slug: "cloud-microsoft",
    title: "cloud.microsoft endpoints",
    description: "Current *.cloud.microsoft hosts.",
    match: (e) =>
      (e.current ?? []).some((a) => /\.cloud\.microsoft$/.test(host(a.url))),
  },
  {
    slug: "end-user",
    title: "End-user surfaces",
    description: "Endpoints users hit directly, like myapps and mygroups.",
    match: (e) => (e.tags ?? []).includes("end-user"),
  },
].filter((c) => !RESERVED_VIEW.has(c.slug));

export const providers = (): string[] => [
  ...new Set(entries.map((e) => e.provider)),
];

export interface ProviderNav {
  provider: string;
  collections: { slug: string; title: string }[];
}

export function providerNav(): ProviderNav[] {
  return providers().map((p) => ({
    provider: p,
    collections: COLLECTIONS.filter((c) =>
      entries.some((e) => e.provider === p && c.match(e)),
    ).map((c) => ({ slug: c.slug, title: c.title })),
  }));
}

export function indexViewPaths(): string[] {
  const paths = ["deprecated"];
  for (const p of providers()) {
    paths.push(p, `${p}/deprecated`);
    for (const c of COLLECTIONS) {
      if (entries.some((e) => e.provider === p && c.match(e)))
        paths.push(`${p}/${c.slug}`);
    }
  }
  return paths;
}

const deprecatedSet = (list: Entry[]) =>
  list.filter((e) => isRetired(e) || (e.history?.length ?? 0) > 0);

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
  const scoped = entries.filter((e) => e.provider === provider);

  if (!view)
    return {
      title: provider,
      description: `Everything under ${provider}.`,
      kind: "entries",
      entries: scoped,
    };

  if (view === "deprecated")
    return {
      title: `${provider}: deprecated`,
      description: `Link histories for ${provider}.`,
      kind: "deprecated",
      entries: deprecatedSet(scoped),
    };

  const c = COLLECTIONS.find((x) => x.slug === view);
  if (c)
    return {
      title: `${provider}: ${c.title}`,
      description: c.description,
      kind: "entries",
      entries: scoped.filter(c.match),
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
  return list.flatMap((e) => {
    const retired = isRetired(e);
    const rows = (e.history ?? []).map((h) => ({
      entry: e,
      url: h.url,
      until: h.until,
      became: h.became,
      retired,
    }));
    return rows.length
      ? rows
      : retired
        ? [{ entry: e, url: "(no live address)", retired }]
        : [];
  });
}

export function buildEnvelope(view: string, list: Entry[]) {
  return {
    schema: "https://aka.dog/schema/entry.json",
    version: 1,
    view,
    generated: new Date().toISOString(),
    entries: list,
  };
}
