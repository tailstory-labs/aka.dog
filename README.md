# aka.dog

Two small systems on one domain, built on **Astro 7** + **Cloudflare Workers Static Assets**:

1. **A redirect shortener** - `aka.dog/{who}/{slug}` `302`s to an external URL.
2. **A derived reference index** - `aka.dog/index/*` pages that are *queries* over a single
   hand-authored entry dataset, organized by namespace (provider). Any vendor can be added as a new
   namespace; the seed dataset currently covers Microsoft's `*.cloud.microsoft` services (and what
   moved where).

The two systems are parallel and only share provider names.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for architecture, commands, how to add data, and deployment.
Working with an AI coding agent? See [AGENTS.md](AGENTS.md).
