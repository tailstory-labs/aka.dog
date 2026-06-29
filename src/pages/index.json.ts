export const prerender = true;

import type { APIRoute } from "astro";
import { buildEnvelope, resolveViewByPath } from "../lib/views";

export const GET: APIRoute = () =>
  Response.json(buildEnvelope("", resolveViewByPath([]).entries));
