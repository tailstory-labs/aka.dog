export const prerender = true;

import type { APIRoute } from "astro";
import { envelopeFor, resolveViewByPath } from "@/lib/views";

export const GET: APIRoute = () =>
  Response.json(envelopeFor("", resolveViewByPath([])));
