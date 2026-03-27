/**
 * Cloudflare Pages Worker — Domain-based language routing + clean URLs
 *
 * Maps language domains to their subdirectory in the deployment:
 *   walkingholidayireland.com  → /          (English, root)
 *   walkingholidayireland.de   → /de/       (German)
 *   wandelvakantieierland.nl   → /nl/       (Dutch)
 *
 * Clean URLs: strips .html extensions and 301-redirects to the clean version.
 * Cloudflare Pages automatically serves about.html when /about is requested.
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

/**
 * Redirect .html URLs to clean versions (301 permanent).
 * /about.html → /about, /walking-tours/dingle-way.html → /walking-tours/dingle-way
 * Exception: /index.html → / (root)
 */
function getCleanUrlRedirect(pathname, search, hash) {
  if (pathname.endsWith('.html')) {
    let clean = pathname.slice(0, -5); // strip .html
    if (clean.endsWith('/index')) {
      clean = clean.slice(0, -6) + '/'; // /foo/index → /foo/
    } else if (clean === '/index') {
      clean = '/';
    }
    return clean + search + hash;
  }
  return null;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const langPrefix = DOMAIN_LANG[url.hostname] || '';

    // ── English domain or no mapping ──────────────────────────
    if (!langPrefix) {
      // Redirect .html to clean URL (301)
      const cleanRedirect = getCleanUrlRedirect(url.pathname, url.search, url.hash);
      if (cleanRedirect) {
        return new Response(null, {
          status: 301,
          headers: { 'Location': cleanRedirect },
        });
      }

      const response = await env.ASSETS.fetch(request);

      // Serve custom 404 page for English site
      if (response.status === 404) {
        try {
          const notFoundUrl = new URL(url);
          notFoundUrl.pathname = '/404.html';
          const notFoundResp = await env.ASSETS.fetch(
            new Request(notFoundUrl.toString(), { headers: request.headers })
          );
          if (notFoundResp.status === 200) {
            return new Response(notFoundResp.body, {
              status: 404,
              headers: notFoundResp.headers,
            });
          }
        } catch (e) { }
      }

      return response;
    }

    // ── Language domains (DE / NL) ────────────────────────────
    const path = url.pathname;

    // Shared assets — serve from root without prefix
    if (isSharedAsset(path)) {
      return env.ASSETS.fetch(request);
    }

    // Strip any existing lang prefix to avoid double-prefixing
    // (e.g. user visits wandelvakantieierland.nl/nl/wandeltochten)
    let cleanPath = path;
    if (path.startsWith(langPrefix + '/')) {
      cleanPath = path.slice(langPrefix.length);
    } else if (path === langPrefix) {
      cleanPath = '/';
    }

    // Redirect .html to clean URL (301)
    const cleanRedirect = getCleanUrlRedirect(cleanPath, url.search, url.hash);
    if (cleanRedirect) {
      return new Response(null, {
        status: 301,
        headers: { 'Location': cleanRedirect },
      });
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
