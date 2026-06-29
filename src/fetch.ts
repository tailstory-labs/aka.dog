import { astro, FetchState } from "astro/fetch";
import { redirects } from "./lib/redirects";
import { RESERVED_TOP } from "./lib/reserved";
import { buildEnvelope, resolveViewByPath } from "./lib/views";

// Index content is derived and changes only on redeploy, so it is safe to cache at the edge.
const INDEX_CACHE = "public, max-age=600";

const wantsJson = (req: Request) => {
  const a = req.headers.get("accept") ?? "";
  return a.includes("application/json") && !a.includes("text/html");
};

const withCache = (res: Response) => {
  const headers = new Headers(res.headers);
  headers.set("cache-control", INDEX_CACHE);
  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers,
  });
};

// Astro 7 advanced-routing entry. The index routes are server-rendered (NOT prerendered) so this
// handler runs for them and can content-negotiate: Accept: application/json → the envelope built
// from bundled entries; browsers → the rendered HTML. The shortener namespace resolves to a 302;
// everything else falls through to Astro. The .json twins stay prerendered static assets.
export default {
  async fetch(request: Request) {
    const state = new FetchState(request);
    const pathname = state.url.pathname.replace(/^\/+/, "");
    const first = pathname.split("/")[0];

    if (first === "index") {
      if (wantsJson(request)) {
        const segments = pathname
          .replace(/^index\/?/, "")
          .split("/")
          .filter(Boolean);
        try {
          const body = buildEnvelope(
            segments.join("/"),
            resolveViewByPath(segments).entries,
          );
          return new Response(JSON.stringify(body), {
            headers: {
              "content-type": "application/json",
              "cache-control": INDEX_CACHE,
            },
          });
        } catch {
          return new Response(
            JSON.stringify({ error: "unknown view", view: segments.join("/") }),
            {
              status: 404,
              headers: { "content-type": "application/json" },
            },
          );
        }
      }
      return withCache(await astro(state)); // server-rendered HTML, edge-cacheable
    }

    if (first && !RESERVED_TOP.has(first)) {
      const target = redirects.get(pathname); // exact {who}/{slug}
      if (target) return Response.redirect(target, 302); // 302 so a short link stays repointable
    }
    return astro(state); // Astro pages/endpoints — 404.astro if no route matches
  },
};
