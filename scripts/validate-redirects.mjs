import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const schema = JSON.parse(
  readFileSync(`${root}/schemas/redirect.schema.json`, "utf8"),
);
const validate = new Ajv2020({ allErrors: true, strict: false }).compile(
  schema,
);

// Keep in sync with src/lib/reserved.ts.
const RESERVED_TOP = new Set([
  "index",
  "introspect",
  "about",
  "schemas",
  ".well-known",
]);
// A namespace is one path segment and becomes the first segment of the URL, so
// no slashes and no leading dot.
const NAMESPACE = /^[A-Za-z0-9][A-Za-z0-9._~-]*$/;

const redirectsDirectory = `${root}/data/redirects`;
let failed = false;
const errors = [];

if (!existsSync(redirectsDirectory)) {
  console.log("OK   no data/redirects directory - nothing to validate.");
  process.exit(0);
}

/** `who/slug` -> the file that authored it, for the aka.dog-target check below. */
const byPath = new Map();
let linkCount = 0;
let namespaceCount = 0;

for (const file of readdirSync(redirectsDirectory).filter((name) =>
  name.endsWith(".json"),
)) {
  const namespace = file.replace(/\.json$/, "");
  const raw = readFileSync(`${redirectsDirectory}/${file}`, "utf8");
  const links = JSON.parse(raw);

  if (validate(links)) {
    namespaceCount++;
    console.log(`OK   redirects/${file}`);
  } else {
    failed = true;
    console.error(`FAIL redirects/${file}`);
    for (const validationError of validate.errors)
      console.error(
        `     ${validationError.instancePath || "/"} ${validationError.message}`,
      );
    continue;
  }

  // The filename is the {who} segment, and src/fetch.ts only consults the
  // redirect map when the first segment is not reserved - so a reserved
  // namespace is a file whose every link 404s, silently.
  if (RESERVED_TOP.has(namespace))
    errors.push(
      `redirects/${file}: "${namespace}" is a reserved top-level word - every link in this file would 404`,
    );
  if (!NAMESPACE.test(namespace))
    errors.push(`redirects/${file}: "${namespace}" is not a valid namespace`);

  // JSON.parse keeps the last of a repeated key, so a duplicate slug is
  // invisible to every check below. Count the keys in the raw bytes instead.
  const written = [...raw.matchAll(/"((?:[^"\\]|\\.)*)"\s*:/g)].map(
    (match) => match[1],
  );
  const parsed = new Set(Object.keys(links));
  if (written.length !== parsed.size)
    for (const slug of parsed)
      if (written.filter((key) => key === slug).length > 1)
        errors.push(
          `redirects/${file}: slug "${slug}" is written more than once - JSON.parse keeps only the last`,
        );

  for (const [slug, target] of Object.entries(links)) {
    const linkPath = `${namespace}/${slug}`;
    linkCount++;

    // No cross-file collision check: the namespace is the filename, the glob is
    // flat, so two files can never produce the same `who/slug`. Within one file,
    // a repeated key is the real risk - caught above, on the raw bytes.
    byPath.set(linkPath, { file, target });

    // The schema pins the shape; this catches what a pattern can't, like a
    // target with a space or a host the URL parser rejects.
    let parsedTarget;
    try {
      parsedTarget = new URL(target);
    } catch {
      errors.push(
        `redirects/${file}: "${slug}" target "${target}" is not a URL - Response.redirect() needs an absolute one`,
      );
      continue;
    }
    if (parsedTarget.protocol !== "http:" && parsedTarget.protocol !== "https:")
      errors.push(
        `redirects/${file}: "${slug}" target "${target}" is not http(s)`,
      );

    // Pointing at another aka.dog URL is legal - /introspect/{link} handles it
    // and /index/links now lists it - but pointing at yourself is a loop.
    const self = `${parsedTarget.host.replace(/^www\./, "")}${parsedTarget.pathname.replace(/\/$/, "")}`;
    if (self === `aka.dog/${linkPath}`)
      errors.push(
        `redirects/${file}: "${linkPath}" redirects to itself (${target})`,
      );
  }
}

// A target may point back at aka.dog - /introspect/{link} follows one by hand
// and /index/links lists it - but it has to land somewhere. A hop into a path
// that is neither a reserved page nor another short link is a 302 straight into
// a 404, and nothing else in the build would notice.
for (const [linkPath, { file, target }] of byPath) {
  let hop;
  try {
    const parsed = new URL(target);
    hop = /^(?:www\.)?aka\.dog$/i.test(parsed.hostname)
      ? parsed.pathname.replace(/^\/+|\/+$/g, "")
      : undefined;
  } catch {
    continue;
  }
  if (!hop || hop === linkPath) continue;
  const first = hop.split("/")[0];
  if (RESERVED_TOP.has(first) || byPath.has(hop)) continue;
  errors.push(
    `redirects/${file}: "${linkPath}" points at aka.dog/${hop}, which is neither a page nor a short link`,
  );
}

if (errors.length) {
  failed = true;
  console.error(`\nRedirect check failures (${errors.length}):`);
  for (const error of errors) console.error(`  - ${error}`);
} else if (!failed) {
  console.log(
    `\nRedirect checks passed (${linkCount} links across ${namespaceCount} namespaces).`,
  );
}

process.exit(failed ? 1 : 0);
