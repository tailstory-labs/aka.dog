// Build gate for the index dataset.
//   1. Structural validation against schema/entry.schema.json (ajv, JSON Schema draft 2020-12).
//   2. Five semantic checks (schema doc §7) that JSON Schema cannot express — these run over the
//      AGGREGATE of every data/entries/*.json file, not per-file.
// Exits non-zero on any failure so `prebuild` keeps `npm run build` red.

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const schema = JSON.parse(readFileSync(`${root}/schema/entry.schema.json`, 'utf8'));
const validate = new Ajv2020({ allErrors: true, strict: false }).compile(schema);

// Mirror of src/lib/reserved.ts — locked decisions, kept in sync by hand.
const RESERVED_TOP = new Set(['index', 'about', '.well-known']);
const RESERVED_VIEW = new Set(['deprecated']);
// Mirror of the COLLECTIONS slugs in src/lib/views.ts (authored collections).
const AUTHORED_COLLECTION_SLUGS = ['cloud-microsoft', 'end-user'];

const dir = `${root}/data/entries`;
let failed = false;
const errors = [];
const all = []; // { entry, file }

// --- 1. structural validation (ajv, draft 2020-12) + aggregate load ---
if (!existsSync(dir)) {
  console.error(`FAIL no data/entries directory at ${dir}`);
  process.exit(1);
}
for (const file of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
  const data = JSON.parse(readFileSync(`${dir}/${file}`, 'utf8'));
  if (validate(data)) {
    console.log(`OK   ${file}`);
  } else {
    failed = true;
    console.error(`FAIL ${file}`);
    for (const e of validate.errors) console.error(`     ${e.instancePath || '/'} ${e.message}`);
  }
  if (Array.isArray(data)) for (const entry of data) all.push({ entry, file });
}

// --- 2. semantic checks (§7) over the aggregate ---
const ids = new Map(); // id -> file
const knownUrls = new Set(); // every current/history url across all entries
for (const { entry } of all) {
  for (const a of entry.current ?? []) if (a?.url) knownUrls.add(a.url);
  for (const h of entry.history ?? []) if (h?.url) knownUrls.add(h.url);
}

// id uniqueness (#1) + reserved-word collisions on id/provider (#5a). Build `ids` first so the
// cross-reference checks below see every id.
for (const { entry, file } of all) {
  if (entry.id != null) {
    if (ids.has(entry.id)) errors.push(`duplicate id "${entry.id}" (${ids.get(entry.id)} and ${file})`);
    else ids.set(entry.id, file);
  }
  if (RESERVED_TOP.has(entry.id)) errors.push(`id "${entry.id}" is a reserved top-level word (${file})`);
  if (RESERVED_TOP.has(entry.provider)) errors.push(`provider "${entry.provider}" is a reserved top-level word (${file})`);
}

for (const { entry, file } of all) {
  // superseded_by resolves (#2)
  if (entry.superseded_by != null && !ids.has(entry.superseded_by))
    errors.push(`superseded_by "${entry.superseded_by}" on "${entry.id}" does not resolve to a known entry id (${file})`);
  // superseded_by ⇒ no current (#3)
  if (entry.superseded_by != null && (entry.current?.length ?? 0) > 0)
    errors.push(`"${entry.id}" has superseded_by but still lists a current address (${file})`);
  // every became url resolves to a known address (#4)
  for (const h of entry.history ?? [])
    if (h?.became != null && !knownUrls.has(h.became))
      errors.push(`history.became "${h.became}" on "${entry.id}" does not resolve to any known address (${file})`);
}

// authored collection slug must not be a reserved page slug (#5b — code-level guard)
for (const slug of AUTHORED_COLLECTION_SLUGS)
  if (RESERVED_VIEW.has(slug)) errors.push(`authored collection slug "${slug}" collides with a reserved page slug`);

if (errors.length) {
  failed = true;
  console.error(`\nSemantic check failures (${errors.length}):`);
  for (const e of errors) console.error(`  - ${e}`);
} else if (!failed) {
  console.log(`\nSemantic checks passed (${all.length} entries, ${ids.size} unique ids).`);
}

process.exit(failed ? 1 : 0);
