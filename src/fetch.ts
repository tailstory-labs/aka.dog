import { astro, FetchState } from 'astro/fetch';
import { redirects } from './lib/redirects';
import { RESERVED_TOP } from './lib/reserved';

// Astro 7 advanced-routing entry: runs inside the request pipeline (the @astrojs/cloudflare worker
// calls app.render, which invokes this). The shortener namespace is ours; everything else — index
// pages, reserved words, the root — falls through to Astro (→ 404 if nothing matches).
export default {
  fetch(request: Request) {
    const state = new FetchState(request);
    const pathname = state.url.pathname.replace(/^\/+/, '');
    const first = pathname.split('/')[0];

    if (first && first !== 'index' && !RESERVED_TOP.has(first)) {
      const target = redirects.get(pathname); // exact {who}/{slug}
      if (target) return Response.redirect(target, 302); // 302 so a short link stays repointable
    }
    return astro(state); // Astro pages/endpoints — 404.astro if no route matches
  },
};
