/**
 * Cloudflare Pages Worker — Domain-based language routing
 *
 * Maps language domains to their subdirectory in the deployment:
 *   walkingholidayireland.com  → /          (English, root)
 *   walkingholidayireland.de   → /de/       (German)
 *   wandelvakantieierland.nl   → /nl/       (Dutch)
 *
 * Shared assets (CSS, JS, images) are served from the root for all domains.
 * Redirect Location headers are rewritten so the /de/ or /nl/ prefix never
 * appears in the browser URL bar on language domains.
 */

const DOMAIN_LANG = {
  'walkingholidayireland.de':     '/de',
  'www.walkingholidayireland.de': '/de',
  'wandelvakantieierland.nl':     '/nl',
  'www.wandelvakantieierland.nl': '/nl',
};

// Paths that are shared across all languages (served from root)
const SHARED_PREFIXES = [
  '/css/', '/js/', '/images/', '/admin/', '/fonts/',
  '/favicon', '/_',
];

function isSharedAsset(pathname) {
  // Known shared files at root
  if (pathname === '/robots.txt' || pathname === '/favicon.ico') return true;
  return SHARED_PREFIXES.some(prefix => pathname.startsWith(prefix));
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const langPrefix = DOMAIN_LANG[url.hostname] || '';

    // English domain or no mapping — serve as-is
    if (!langPrefix) {
      return env.ASSETS.fetch(request);
    }

    const path = url.pathname;

    // Shared assets — serve from root without prefix
    if (isSharedAsset(path)) {
      return env.ASSETS.fetch(request);
    }

    // Strip any existing lang prefix to avoid double-prefixing
    // (e.g. user visits wandelvakantieierland.nl/nl/wandeltochten.html)
    let cleanPath = path;
    if (path.startsWith(langPrefix + '/')) {
      cleanPath = path.slice(langPrefix.length);
    } else if (path === langPrefix) {
      cleanPath = '/';
    }

    // Rewrite URL: prepend language directory
    const rewrittenPath = langPrefix + (cleanPath === '/' ? '/index.html' : cleanPath);
    const rewrittenUrl = new URL(url);
    rewrittenUrl.pathname = rewrittenPath;

    const response = await env.ASSETS.fetch(
      new Request(rewrittenUrl.toString(), {
        method: request.method,
        headers: request.headers,
      })
    );

    // Rewrite redirect Location headers to strip lang prefix
    // so the browser URL stays clean (no /nl/ or /de/ showing)
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('Location');
      if (location) {
        try {
          const locUrl = new URL(location, url.origin);
          if (locUrl.pathname.startsWith(langPrefix + '/')) {
            locUrl.pathname = locUrl.pathname.slice(langPrefix.length);
            const newHeaders = new Headers(response.headers);
            newHeaders.set('Location', locUrl.pathname + locUrl.search + locUrl.hash);
            return new Response(null, {
              status: response.status,
              statusText: response.statusText,
              headers: newHeaders,
            });
          }
        } catch (e) {
          // If location parsing fails, return response as-is
        }
      }
    }

    // Serve language-specific 404 page when asset not found
    if (response.status === 404) {
      try {
        const notFoundUrl = new URL(url);
        notFoundUrl.pathname = langPrefix + '/404.html';
        const notFoundResp = await env.ASSETS.fetch(
          new Request(notFoundUrl.toString(), { headers: request.headers })
        );
        if (notFoundResp.status === 200) {
          return new Response(notFoundResp.body, {
            status: 404,
            headers: notFoundResp.headers,
          });
        }
      } catch (e) {
        // Fall through to original 404
      }
    }

    return response;
  },
};
