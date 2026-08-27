// Unbounded input, so there is no getStaticPaths() to write — this is the one
// difference from index/[...path].json.ts, which prerenders a closed set of views.
export const prerender = false;

import type { APIRoute } from "astro";
import {
  introspectionEnvelope,
  introspectionStatus,
  introspectPathname,
} from "@/lib/introspect";

// url.pathname, not params.link: the link is decoded exactly once, inside
// introspectPathname().
export const GET: APIRoute = ({ url }) => {
  const result = introspectPathname(url.pathname);
  return Response.json(introspectionEnvelope(result), {
    status: introspectionStatus(result),
    headers: { "cache-control": "public, max-age=600" },
  });
};
