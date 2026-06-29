export const prerender = true;
import type { APIRoute } from 'astro';
import { indexViewPaths, resolveViewByPath, buildEnvelope } from '../../lib/views';

// <view>.json for every non-dump view (mirror of the HTML [...path] route; the rest param always
// has >= 1 segment, so there is no empty-rest edge case here).
export function getStaticPaths() {
  return indexViewPaths().map((path) => ({ params: { path } }));
}

export const GET: APIRoute = ({ params }) => {
  const path = params.path ?? '';
  return Response.json(buildEnvelope(path, resolveViewByPath(path.split('/')).entries));
};
