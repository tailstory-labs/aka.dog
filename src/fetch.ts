import { astro, FetchState } from "astro/fetch";
import {
  introspectionEnvelope,
  introspectionStatus,
  introspectPathname,
} from "@/lib/introspect";
import { redirects } from "@/lib/redirects";
import { RESERVED_TOP } from "@/lib/reserved";
import { buildEnvelope, envelopeExtra, resolveViewByPath } from "@/lib/views";

const INDEX_CACHE = "public, max-age=600";

const wantsJson = (request: Request) => {
  const acceptHeader = request.headers.get("accept") ?? "";
  return (
    acceptHeader.includes("application/json") &&
    !acceptHeader.includes("text/html")
  );
};

const withCache = (response: Response) => {
  const headers = new Headers(response.headers);
  headers.set("cache-control", INDEX_CACHE);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};

export default {
  async fetch(request: Request) {
    const state = new FetchState(request);
    const pathname = state.url.pathname.replace(/^\/+/, "");
    const firstSegment = pathname.split("/")[0];

    if (firstSegment === "index") {
      if (wantsJson(request)) {
        const segments = pathname
          .replace(/^index\/?/, "")
          .split("/")
          .filter(Boolean);
        try {
          const view = resolveViewByPath(segments);
          const body = buildEnvelope(
            segments.join("/"),
            view.entries,
            envelopeExtra(view),
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
      return withCache(await astro(state));
    }

    if (firstSegment === "introspect") {
      if (wantsJson(request)) {
        // state.url.pathname, not the leading-slash-stripped `pathname` above:
        // introspectPathname() strips the /introspect prefix itself, so both
        // call sites must hand it the same input shape. No try/catch needed -
        // introspect() returns kind "unknown" rather than throwing, which is
        // what lets this 404 carry a full envelope instead of an error stub.
        const result = introspectPathname(state.url.pathname);
        return new Response(JSON.stringify(introspectionEnvelope(result)), {
          status: introspectionStatus(result),
          headers: {
            "content-type": "application/json",
            "cache-control": INDEX_CACHE,
          },
        });
      }
      return withCache(await astro(state));
    }

    if (firstSegment && !RESERVED_TOP.has(firstSegment)) {
      const target = redirects.get(pathname);
      if (target) return Response.redirect(target, 302);
    }
    return astro(state);
  },
};
