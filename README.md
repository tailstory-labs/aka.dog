# aka.dog

Two small systems on one domain, built on **Astro 7** + **Cloudflare Workers Static Assets**:

1. **A redirect shortener** - `aka.dog/{who}/{slug}` `302`s to an external URL. Every link it
   serves is listed at `aka.dog/index/links`.
2. **A derived reference index** - `aka.dog/index/*` pages that are *queries* over a single
   hand-authored entry dataset, organized by namespace (provider). Any vendor can be added as a new
   namespace.

The two systems are parallel and only share provider names. The index *lists* the shortener at
`/index/links`, but no page joins the two datasets - `/introspect/{link}` is where the same string
is put to both.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for architecture, commands, how to add data, and deployment.<br>
Working with an AI coding agent? See [AGENTS.md](AGENTS.md).
