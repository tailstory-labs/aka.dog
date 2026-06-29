export const prerender = true;

import type { APIRoute } from "astro";
import {
  buildEnvelope,
  indexViewPaths,
  resolveViewByPath,
} from "../../lib/views";

export function getStaticPaths() {
  return indexViewPaths().map((path) => ({ params: { path } }));
}

export const GET: APIRoute = ({ params }) => {
  const path = params.path ?? "";
  return Response.json(
    buildEnvelope(path, resolveViewByPath(path.split("/")).entries),
  );
};
