import {
  type CuratedPageDoc,
  curatedPages,
  curatedPagesFor,
  findCuratedPage,
} from "@/lib/curated";
import type {
  CuratedGroup,
  CuratedItem,
  CuratedPage,
} from "@/lib/curated-types";
import { entries } from "@/lib/entries";
import { RESERVED_VIEW } from "@/lib/reserved";
import type { Entry } from "@/lib/types";

const host = (url: string) => url.split("/")[0] ?? "";
const isRetired = (entry: Entry) => !entry.current?.length;

const entriesById = new Map(entries.map((entry) => [entry.id, entry]));
const PROVIDERS = new Set(entries.map((entry) => entry.provider));

export const primaryAddress = (entry: Entry): string | undefined =>
  entry.current?.[0]?.url;

export interface Collection {
  slug: string;
  title: string;
  description: string;
  match: (entry: Entry) => boolean;
}

const ALL_COLLECTIONS: Collection[] = [
  {
    slug: "cloud-microsoft",
    title: "cloud.microsoft endpoints",
    description: "Current *.cloud.microsoft hosts",
    match: (entry) =>
      (entry.current ?? []).some((address) =>
        /\.cloud\.microsoft$/.test(host(address.url)),
      ),
  },
  {
    slug: "end-user",
    title: "End-user surfaces",
    description: "Endpoints users hit directly, like myapps and mygroups",
    match: (entry) => (entry.tags ?? []).includes("end-user"),
  },
];

export const COLLECTIONS: Collection[] = ALL_COLLECTIONS.filter(
  (collection) => !RESERVED_VIEW.has(collection.slug),
);

export const providers = (): string[] => [...PROVIDERS];

export interface ProviderNav {
  provider: string;
  collections: { slug: string; title: string }[];
}

export function providerNav(): ProviderNav[] {
  return providers().map((provider) => {
    const curated = curatedPagesFor(provider);
    const curatedSlugs = new Set(curated.map((page) => page.slug));
    return {
      provider,
      collections: [
        ...curated,
        // A curated page shadows a same-slug collection, so list it once.
        ...COLLECTIONS.filter(
          (collection) =>
            !curatedSlugs.has(collection.slug) &&
            entries.some(
              (entry) => entry.provider === provider && collection.match(entry),
            ),
        ).map((collection) => ({
          slug: collection.slug,
          title: collection.title,
        })),
      ],
    };
  });
}

export function indexViewPaths(): string[] {
  // A Set, not an array: a curated page and a collection can share a slug, and
  // getStaticPaths() throws on duplicate params.
  const paths = new Set<string>(["deprecated"]);
  for (const provider of providers()) {
    paths.add(provider);
    paths.add(`${provider}/deprecated`);
    for (const page of curatedPagesFor(provider))
      paths.add(`${provider}/${page.slug}`);
    for (const collection of COLLECTIONS)
      if (
        entries.some(
          (entry) => entry.provider === provider && collection.match(entry),
        )
      )
        paths.add(`${provider}/${collection.slug}`);
  }
  return [...paths];
}

const deprecatedSet = (list: Entry[]) =>
  list.filter((entry) => isRetired(entry) || (entry.history?.length ?? 0) > 0);

export interface ResolvedItem {
  href: string;
  label: string;
  blurb?: string | undefined;
  entry?: Entry | undefined;
}

export interface ResolvedGroup {
  title: string;
  note?: string | undefined;
  items: ResolvedItem[];
}

interface ViewBase {
  title: string;
  description: string;
  entries: Entry[];
}

export type ResolvedView =
  | (ViewBase & { kind: "entries" })
  | (ViewBase & { kind: "deprecated" })
  | (ViewBase & {
      kind: "curated";
      lead?: ResolvedItem | undefined;
      groups: ResolvedGroup[];
      source: CuratedPageDoc;
    });

function resolveItem(item: CuratedItem): ResolvedItem | undefined {
  if ("entry" in item) {
    const entry = entriesById.get(item.entry);
    const url = entry && primaryAddress(entry);
    // validate-curated.mjs rejects both cases at build time.
    if (!entry || !url) return undefined;
    return {
      href: `https://${url}`,
      label: item.label ?? entry.name,
      blurb: item.blurb,
      entry,
    };
  }
  return { href: `https://${item.url}`, label: item.name, blurb: item.blurb };
}

function resolveCurated(page: CuratedPageDoc): ResolvedView {
  const lead = page.lead ? resolveItem(page.lead) : undefined;
  const groups: ResolvedGroup[] = page.groups.map((group) => ({
    title: group.title,
    note: group.note,
    items: group.items
      .map(resolveItem)
      .filter((item): item is ResolvedItem => item !== undefined),
  }));

  // Entry-backed items, curated order, deduped. Keeping `entries` populated is
  // what lets the JSON twin, the envelope and the sitemap stay untouched.
  const seen = new Set<string>();
  const resolvedEntries: Entry[] = [];
  for (const item of [
    ...(lead ? [lead] : []),
    ...groups.flatMap((group) => group.items),
  ])
    if (item.entry && !seen.has(item.entry.id)) {
      seen.add(item.entry.id);
      resolvedEntries.push(item.entry);
    }

  return {
    kind: "curated",
    title: page.title,
    description: page.description,
    lead,
    groups,
    entries: resolvedEntries,
    source: page,
  };
}

export function resolveViewByPath(segments: string[]): ResolvedView {
  if (segments.length === 0)
    return {
      title: "aka.dog index",
      description: "Everything tracked here",
      kind: "entries",
      entries,
    };

  if (segments.length === 1 && segments[0] === "deprecated")
    return {
      title: "Deprecated",
      description: "Link histories across all providers",
      kind: "deprecated",
      entries: deprecatedSet(entries),
    };

  // Anything deeper than {provider}/{view} used to silently render {provider}.
  if (segments.length > 2)
    throw new Error(`Unknown view: ${segments.join("/")}`);

  const [provider, view] = segments;

  // An unknown provider used to render an empty list with a 200.
  if (!provider || !PROVIDERS.has(provider))
    throw new Error(`Unknown view: ${segments.join("/")}`);

  const scopedEntries = entries.filter((entry) => entry.provider === provider);

  if (!view)
    return {
      title: provider,
      description: `Everything under ${provider}`,
      kind: "entries",
      entries: scopedEntries,
    };

  if (view === "deprecated")
    return {
      title: `${provider}: deprecated`,
      description: `Link histories for ${provider}`,
      kind: "deprecated",
      entries: deprecatedSet(scopedEntries),
    };

  // A curated page wins over a same-slug collection; without one, the
  // tag-driven collection still answers.
  const curated = findCuratedPage(provider, view);
  if (curated) return resolveCurated(curated);

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
  url?: string | undefined;
  until?: string | undefined;
  became?: string | undefined;
  retired: boolean;
}
export function deprecationRows(list: Entry[]): DeprecationRow[] {
  return list.flatMap((entry) => {
    const retired = isRetired(entry);
    const rows: DeprecationRow[] = (entry.history ?? []).map(
      (historyEntry) => ({
        entry,
        url: historyEntry.url,
        until: historyEntry.until,
        became: historyEntry.became,
        retired,
      }),
    );
    return rows.length ? rows : retired ? [{ entry, retired }] : [];
  });
}

/** The curated extras a view contributes to its JSON envelope, if any. */
export const envelopeExtra = (view: ResolvedView) =>
  view.kind === "curated"
    ? { lead: view.source.lead, groups: view.source.groups }
    : undefined;

export function buildEnvelope(
  view: string,
  list: Entry[],
  extra?:
    | {
        lead?: CuratedItem | undefined;
        groups?: CuratedPage["groups"] | undefined;
      }
    | undefined,
) {
  return {
    schema: "https://aka.dog/schemas/entry.json",
    version: 1,
    view,
    generated: new Date().toISOString(),
    // Authored groups, verbatim: already validated, tiny, and consumers join
    // them to `entries` on id.
    ...(extra?.groups
      ? {
          groups_schema: "https://aka.dog/schemas/curated.json",
          ...(extra.lead ? { lead: extra.lead } : {}),
          groups: extra.groups,
        }
      : {}),
    entries: list,
  };
}

export type { CuratedGroup, CuratedItem, CuratedPageDoc };
export { curatedPages, curatedPagesFor };
