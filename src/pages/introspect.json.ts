// The .json twin of the /introspect landing page, mirroring index.json.ts.
// Astro's rest-param route only matches /introspect/{link}.json, so without this
// file the bare /introspect.json 404s while `Accept: application/json` on
// /introspect succeeds - an asymmetry the house ".json twin" rule shouldn't have.
export const prerender = true;

import type { APIRoute } from "astro";
import { introspect, introspectionEnvelope } from "@/lib/introspect";

export const GET: APIRoute = () =>
  Response.json(introspectionEnvelope(introspect("")));
