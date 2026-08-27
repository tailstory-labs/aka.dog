import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const schema = JSON.parse(
  readFileSync(`${root}/schemas/curated.schema.json`, "utf8"),
);
const validate = new Ajv2020({ allErrors: true, strict: false }).compile(
  schema,
);

// Keep in sync with src/lib/reserved.ts.
const RESERVED_VIEW = new Set(["deprecated", "links"]);
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const curatedDirectory = `${root}/data/curated`;
const entriesDirectory = `${root}/data/entries`;
let failed = false;
const errors = [];

// A curated page references entries by id; resolving those references is the
// whole point of the format, so read the entry dataset here too.
const entriesById = new Map();
if (existsSync(entriesDirectory))
  for (const file of readdirSync(entriesDirectory).filter((fileName) =>
    fileName.endsWith(".json"),
  )) {
    const data = JSON.parse(
      readFileSync(`${entriesDirectory}/${file}`, "utf8"),
    );
    if (Array.isArray(data))
      for (const entry of data) if (entry?.id) entriesById.set(entry.id, entry);
  }
const knownProviders = new Set(
  [...entriesById.values()].map((entry) => entry.provider),
);

if (!existsSync(curatedDirectory)) {
  console.log("OK   no data/curated directory - nothing to validate.");
  process.exit(0);
}

let pageCount = 0;
for (const provider of readdirSync(curatedDirectory).filter((name) =>
  statSync(`${curatedDirectory}/${name}`).isDirectory(),
)) {
  if (!knownProviders.has(provider))
    errors.push(
      `data/curated/${provider}/ is not a provider present in data/entries`,
    );

  for (const file of readdirSync(`${curatedDirectory}/${provider}`).filter(
    (name) => name.endsWith(".json"),
  )) {
    const slug = file.replace(/\.json$/, "");
    const label = `${provider}/${file}`;
    const page = JSON.parse(
      readFileSync(`${curatedDirectory}/${provider}/${file}`, "utf8"),
    );
    pageCount++;

    if (validate(page)) {
      console.log(`OK   curated/${label}`);
    } else {
      failed = true;
      console.error(`FAIL curated/${label}`);
      for (const validationError of validate.errors)
        console.error(
          `     ${validationError.instancePath || "/"} ${validationError.message}`,
        );
      continue;
    }

    if (!SLUG.test(slug))
      errors.push(`curated/${label}: "${slug}" is not a valid slug`);
    if (RESERVED_VIEW.has(slug))
      errors.push(`curated/${label}: "${slug}" is a reserved view slug`);

    const seen = new Set();
    const items = [
      ...(page.lead ? [page.lead] : []),
      ...page.groups.flatMap((group) => group.items),
    ];
    for (const item of items) {
      if (item.entry == null) continue;
      const entry = entriesById.get(item.entry);
      if (!entry) {
        errors.push(
          `curated/${label}: entry "${item.entry}" does not resolve to a known entry id`,
        );
        continue;
      }
      if (entry.provider !== provider)
        errors.push(
          `curated/${label}: entry "${item.entry}" belongs to provider "${entry.provider}" (use an inline {name, url} item for cross-provider links)`,
        );
      if (!(entry.current?.length > 0))
        errors.push(
          `curated/${label}: entry "${item.entry}" has no current address - a curated page must not link somewhere dead`,
        );
      if (seen.has(item.entry))
        errors.push(`curated/${label}: entry "${item.entry}" appears twice`);
      seen.add(item.entry);
    }
  }
}

if (errors.length) {
  failed = true;
  console.error(`\nCurated check failures (${errors.length}):`);
  for (const error of errors) console.error(`  - ${error}`);
} else if (!failed) {
  console.log(`\nCurated checks passed (${pageCount} pages).`);
}

process.exit(failed ? 1 : 0);
