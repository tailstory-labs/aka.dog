export const prerender = true;

import type { APIRoute } from "astro";
import {
  buildEnvelope,
  envelopeExtra,
  indexViewPaths,
  resolveViewByPath,
} from "@/lib/views";

export function getStaticPaths() {
  return indexViewPaths().map((path) => ({ params: { path } }));
}

export const GET: APIRoute = ({ params }) => {
  const path = params.path ?? "";
  const view = resolveViewByPath(path.split("/").filter(Boolean));
  return Response.json(buildEnvelope(path, view.entries, envelopeExtra(view)));
};
