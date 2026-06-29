export const prerender = true;
import type { APIRoute } from 'astro';
import { resolveViewByPath, buildEnvelope } from '../lib/views';

// /index.json — the full dump
export const GET: APIRoute = () => Response.json(buildEnvelope('', resolveViewByPath([]).entries));
