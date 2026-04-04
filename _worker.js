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

/**
 * Add no-cache headers to HTML responses so Cloudflare doesn't
 * serve stale pages after builds.
 */
function withCacheHeaders(response, pathname) {
  const ct = response.headers.get('content-type') || '';
  const newHeaders = new Headers(response.headers);

  if (ct.includes('text/html')) {
    // HTML: no cache so deploys are instant
    newHeaders.set('Cache-Control', 'public, max-age=0, must-revalidate');
  } else if (/\.(webp|jpg|jpeg|png|svg|avif|gif|ico)$/i.test(pathname || '')) {
    // Images: 30-day cache (they rarely change; filenames change when updated)
    newHeaders.set('Cache-Control', 'public, max-age=2592000, immutable');
  } else if (/\.(css|js|woff2?)$/i.test(pathname || '')) {
    // CSS/JS/Fonts: 30-day cache
    newHeaders.set('Cache-Control', 'public, max-age=2592000, immutable');
  } else {
    return response;
  }

  return new Response(response.body, {
    status: response.status,
    headers: newHeaders,
  });
}

/**
 * Legacy WordPress URL redirects — old URLs that Google still indexes.
 * These 301 to the correct new location to preserve SEO value and fix 404s.
 * Paths should NOT include trailing slashes (we strip them before matching).
 */
const LEGACY_REDIRECTS = {
  // ── English site ──
  '': {
    // Old WordPress blog posts at root → /blog/
    '/the-famine-roads-of-ireland': '/blog/the-famine-roads-of-ireland',
    '/difference-between-hiking-and-walking': '/blog/difference-between-hiking-and-walking',
    '/antrim-coast': '/blog/antrim-coast-walk',
    '/irish-pilgrim-paths-of-ireland': '/blog/irish-pilgrim-paths-of-ireland',
    '/our-top-five-connemara-hikes': '/blog/our-top-five-connemara-hikes',
    '/differences-between-rambling-and-hiking': '/blog/differences-between-rambling-and-hiking',
    '/celtic-music-and-the-tin-whistle': '/blog/celtic-music-and-the-tin-whistle',
    '/st-kevin-of-glendalough': '/blog/st-kevin-of-glendalough',
    '/solo-inn-to-inn-hiking-ireland': '/blog/solo-inn-to-inn-hiking-ireland',
    '/visit-the-nine-glens-of-antrim': '/blog/glens-of-antrim-walking',
    '/irish-national-anthem': '/blog/irish-national-anthem',
    '/the-best-time-to-visit-ireland': '/blog/best-time-visit-ireland-hiking',
    '/hiking-the-kerry-way': '/walking-tours/kerry-way',
    '/tips-for-hiking-in-ireland': '/blog/tips-for-hiking-in-ireland',
    '/the-wicklow-way-map': '/walking-area-wicklow-way',
    // Old WordPress /self-guided-hiking-tours/ prefix
    '/self-guided-hiking-tours': '/walking-tours',
    '/self-guided-hiking-tours/the-wicklow-way': '/walking-tours/wicklow-way',
    '/self-guided-hiking-tours/barrow-way': '/walking-tours/full-barrow-way-walking',
    '/self-guided-hiking-tours/antrim-glens-causeway-coast-walking-tours': '/walking-tours/causeway-coast',
    // Same paths but with "walking" instead of "hiking" (both URL patterns existed)
    '/self-guided-walking-tours': '/walking-tours',
    '/self-guided-walking-tours/the-wicklow-way': '/walking-tours/wicklow-way',
    '/self-guided-walking-tours/barrow-way': '/walking-tours/full-barrow-way-walking',
    '/self-guided-walking-tours/antrim-glens-causeway-coast-walking-tours': '/walking-tours/causeway-coast',
    // Old WordPress /Walking-Tour/ prefix (case-sensitive, handled below)
    '/Walking-Tour/cooley-and-mournes-hiking-tour': '/walking-tours/cooley-mournes',
    '/Walking-Tour/wicklow-way-8-days': '/walking-tours/wicklow-way',
    '/Walking-Tour/kerry-way-8-days': '/walking-tours/kerry-way',
    '/Walking-Tour/the-dingle-way-8-days': '/walking-tours/dingle-way-walking-tour-8d',
    '/Walking-Tour/barrow-way-8-day-hiking-tour': '/walking-tours/full-barrow-way-walking',
    '/Walking-Tour/wicklow-way-10-days': '/walking-tours/wicklow-way-10-days',
    // Old WordPress /walking-holiday/ prefix
    '/walking-holiday/wicklow-way-hiking-tour': '/walking-tours/wicklow-way',
    // Old WordPress /Hiking-location/ prefix
    '/Hiking-location/irelands-ancient-east': '/ancient-east',
    '/Hiking-location/wicklow-way': '/walking-area-wicklow-way',
    // Old WordPress misc pages
    '/home/about-walking-holiday-ireland': '/about',
    '/author/whi': '/about',
    // ── Internal broken link fixes (2026-04-04 audit) ──
    // Blog posts linked at root instead of /blog/
    '/kerry-way-complete-guide': '/blog/kerry-way-walking-guide',
    '/wicklow-way-complete-guide': '/blog/wicklow-way-complete-guide',
    '/dingle-way-walking-guide': '/blog/dingle-way-walking-guide',
    '/burren-way-walking-guide': '/blog/burren-way-walking-guide',
    '/beara-way-complete-guide': '/blog/beara-way-hiking-guide',
    '/the-irish-hiking-weather': '/blog/the-irish-weather',
    '/best-hillwalking-locations-ireland': '/blog/best-hillwalking-locations-in-ireland',
    '/hiking-in-donegal': '/blog/hiking-in-donegal',
    // Old/removed tour pages
    '/walking-tours/wicklow-way-8-days-easy': '/walking-tours/wicklow-way',
    '/walking-tours/full-barrow-way-walking-5-days-easy': '/walking-tours/full-barrow-way-walking',
    // Old WP slugs with no direct match
    '/st-kevins-glendalough-wicklow': '/blog/st-kevin-of-glendalough',
    '/guided-walking-holidays-in-ireland': '/walking-tours',
    '/visit-9-antrim-glens': '/blog/glens-of-antrim-walking',
    '/price-promise': '/about',
  },
  // ── German site ──
  '/de': {
    // Old tour slugs → canonical Supabase tour slugs
    '/wandertouren/barrow-way': '/wandertouren/full-barrow-way-walking',
    '/wandertouren/barrow-way-5-days': '/wandertouren/barrow-way-5-days-easy',
    '/wandertouren/burren-way': '/wandertouren/burren-7-days',
    '/wandertouren/dingle-way': '/wandertouren/dingle-way-walking-tour-8d',
  },
  // ── Dutch site (old WordPress pages → new structure) ──
  '/nl': {
    '/stekker-voor-ierland': '/blog/stekker-voor-ierland',
    '/wandelen-dublin': '/blog/wandelen-dublin',
    '/individuele-wandelvakanties': '/blog/individuele-wandelvakanties',
    '/individuele-wandelvakanties/wicklow-way': '/wandeltochten/wicklow-way',
    '/uw-reis': '/hoe-het-werkt',
    '/travel-to-ireland': '/blog/travel-to-ireland',
    // Old tour slugs → canonical Supabase tour slugs
    '/wandeltochten/barrow-way': '/wandeltochten/full-barrow-way-walking',
    '/wandeltochten/barrow-way-5-days': '/wandeltochten/barrow-way-5-days-easy',
    '/wandeltochten/burren-way': '/wandeltochten/burren-7-days',
    '/wandeltochten/dingle-way': '/wandeltochten/dingle-way-walking-tour-8d',
  },
};

/**
 * Check if a path matches a legacy redirect and return the target, or null.
 * Strips trailing slashes before matching.
 */
function getLegacyRedirect(cleanPath, langPrefix) {
  const map = LEGACY_REDIRECTS[langPrefix || ''];
  if (!map) return null;
  // Strip trailing slash for matching (WordPress URLs had trailing slashes)
  const normalized = cleanPath.endsWith('/') && cleanPath !== '/'
    ? cleanPath.slice(0, -1)
    : cleanPath;
  // Exact match first (handles case-sensitive paths like /Walking-Tour/)
  if (map[normalized]) return map[normalized];
  // Case-insensitive fallback (old WordPress URLs had mixed case)
  const lower = normalized.toLowerCase();
  for (const [key, val] of Object.entries(map)) {
    if (key.toLowerCase() === lower) return val;
  }
  return null;
}

const DOMAIN_LANG = {
  'walkingholidayireland.de':     '/de',
  'www.walkingholidayireland.de': '/de',
  'wandelvakantieierland.nl':     '/nl',
  'www.wandelvakantieierland.nl': '/nl',
};

/**
 * Canonical (non-www) hostname for each domain.
 * www → non-www redirects prevent duplicate content across all 3 sites.
 */
const WWW_CANONICAL = {
  'www.walkingholidayireland.com': 'walkingholidayireland.com',
  'www.walkingholidayireland.de':  'walkingholidayireland.de',
  'www.wandelvakantieierland.nl':  'wandelvakantieierland.nl',
};

// Paths that are shared across all languages (served from root)
const SHARED_PREFIXES = [
  '/css/', '/js/', '/images/', '/admin/', '/fonts/',
  '/favicon', '/_',
];

function isSharedAsset(pathname) {
  // Known shared files at root
  if (pathname === '/robots.txt' || pathname === '/favicon.ico' || pathname.endsWith('.txt')) return true;
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

/**
 * Translate English URL slugs to the correct language for DE/NL domains.
 * Returns the translated path if a redirect is needed, or null if no translation applies.
 */
const SLUG_MAP = {
  '/de': {
    // Static pages
    '/about': '/ueber-uns',
    '/contact': '/kontakt',
    '/how-it-works': '/so-funktioniert-es',
    '/tour-grading': '/tourbewertung',
    '/tailor-made': '/massgeschneidert',
    '/reviews': '/bewertungen',
    '/destinations': '/wanderziele-irland',
    '/walking-tours': '/wandertouren',
    '/self-guided-walking-holidays-ireland': '/individuelle-wanderferien-irland',
    '/solo-walking-holidays-ireland': '/solo-wanderurlaub-irland',
    '/walking-holidays-ireland-over-50s': '/wanderurlaub-irland-50-plus',
    '/northern-ireland': '/nordirland',
    '/privacy-policy': '/datenschutz',
    '/terms-and-conditions': '/agb',
    '/faq': '/faq',
    '/mountains-of-mourne': '/mourne-mountains',
    '/best-hiking-trails-ireland': '/beste-wanderwege-irland',
    '/hiking-ireland': '/wandern-irland',
    '/checkout': '/buchung',
    '/gift-vouchers': '/geschenkgutscheine',
  },
  '/nl': {
    '/about': '/over-ons',
    '/contact': '/contact',
    '/how-it-works': '/hoe-het-werkt',
    '/tour-grading': '/moeilijkheidsgraad',
    '/tailor-made': '/op-maat',
    '/reviews': '/beoordelingen',
    '/destinations': '/wandelbestemmingen',
    '/walking-tours': '/wandeltochten',
    '/self-guided-walking-holidays-ireland': '/wandelvakantie-ierland-op-eigen-houtje',
    '/solo-walking-holidays-ireland': '/solo-wandelvakantie-ierland',
    '/walking-holidays-ireland-over-50s': '/wandelvakantie-ierland-50-plus',
    '/northern-ireland': '/noord-ierland',
    '/privacy-policy': '/privacybeleid',
    '/terms-and-conditions': '/algemene-voorwaarden',
    '/faq': '/faq',
    '/mountains-of-mourne': '/mourne-mountains',
    '/best-hiking-trails-ireland': '/beste-wandelpaden-ierland',
    '/hiking-ireland': '/wandelen-ierland',
    '/checkout': '/boeken',
    '/gift-vouchers': '/cadeaubonnen',
  },
};

/**
 * Deprecated short-slug destinations that must redirect to their full canonical slug.
 * These apply AFTER prefix translation, so use the translated prefix per language.
 * Format: { shortSlug: fullSlug } — these are the suffix after the walking-area/wandergebiet/wandelgebied prefix.
 */
const DEPRECATED_SHORT_SLUGS = {
  'barrow':   'barrow-way',
  'burren':   'burren-way',
  'causeway': 'causeway-coast',
  'cooley':   'cooley-mournes',
  'dingle':   'dingle-way',
  'kerry':    'kerry-way',
  'wicklow':  'wicklow-way',
};

/**
 * Walking area prefix per language (must match build.py WALKING_AREA_PREFIX).
 */
const WA_PREFIX_MAP = {
  '':    'walking-area',    // English (no langPrefix)
  '/de': 'wandergebiet',
  '/nl': 'wandelgebied',
};

/**
 * Check if a path is a deprecated short-slug walking area and return the
 * canonical redirect target, or null if no redirect is needed.
 * Works for all languages: /walking-area-wicklow → /walking-area-wicklow-way
 *                          /wandergebiet-wicklow → /wandergebiet-wicklow-way
 */
function getDeprecatedSlugRedirect(cleanPath, langPrefix) {
  const waPrefix = WA_PREFIX_MAP[langPrefix || ''];
  if (!waPrefix) return null;

  const prefix = '/' + waPrefix + '-';
  if (!cleanPath.startsWith(prefix)) return null;

  const suffix = cleanPath.slice(prefix.length);
  const fullSlug = DEPRECATED_SHORT_SLUGS[suffix];
  if (fullSlug) {
    return prefix + fullSlug;
  }
  return null;
}

/**
 * Old prefix redirects — maps retired URL prefixes to their canonical equivalents.
 * Handles: destination- → walking-area- (EN), wanderziel- → wandergebiet- (DE),
 *          wandelbestemming- → wandelgebied- (NL), tours/ → walking-tours/ (EN only)
 */
const OLD_PREFIX_MAP = {
  '':    { 'destination-': 'walking-area-', 'tours/': 'walking-tours/' },
  '/de': { 'wanderziel-': 'wandergebiet-' },
  '/nl': { 'wandelbestemming-': 'wandelgebied-' },
};

/**
 * Check if a path uses an old/retired prefix and return the redirect target.
 * e.g. /destination-wicklow-way → /walking-area-wicklow-way (EN)
 *      /wanderziel-wicklow-way → /wandergebiet-wicklow-way (DE)
 *      /wandelbestemming-kerry-way → /wandelgebied-kerry-way (NL)
 *      /tours/dingle-way → /walking-tours/dingle-way (EN only)
 */
function getOldPrefixRedirect(cleanPath, langPrefix) {
  const map = OLD_PREFIX_MAP[langPrefix || ''];
  if (!map) return null;
  const pathNoSlash = cleanPath.slice(1);
  for (const [oldPfx, newPfx] of Object.entries(map)) {
    if (pathNoSlash.startsWith(oldPfx)) {
      return '/' + pathNoSlash.replace(oldPfx, newPfx);
    }
  }
  return null;
}

// Prefix translations: walking-area → wandergebiet/wandelgebied, etc.
const PREFIX_MAP = {
  '/de': {
    'walking-area-': 'wandergebiet-',
    'destination-': 'wanderziel-',
    'walking-tours/': 'wandertouren/',
  },
  '/nl': {
    'walking-area-': 'wandelgebied-',
    'destination-': 'wandelbestemming-',
    'walking-tours/': 'wandeltochten/',
  },
};

function translateSlug(cleanPath, langPrefix) {
  if (!langPrefix) return null;
  const map = SLUG_MAP[langPrefix];
  if (!map) return null;

  // Exact match for static pages
  if (map[cleanPath]) {
    // Only redirect if the translation is different from the current path
    if (map[cleanPath] !== cleanPath) {
      return map[cleanPath];
    }
    return null;
  }

  // Prefix-based translation (walking-area-*, destination-*, walking-tours/*)
  const prefixes = PREFIX_MAP[langPrefix];
  if (prefixes) {
    // Strip leading slash for prefix matching
    const pathNoSlash = cleanPath.slice(1);
    for (const [enPrefix, langPrefixStr] of Object.entries(prefixes)) {
      if (pathNoSlash.startsWith(enPrefix)) {
        return '/' + pathNoSlash.replace(enPrefix, langPrefixStr);
      }
    }
  }

  return null;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // ── www → non-www redirect (301) ─────────────────────────
    // Prevents duplicate content across all 3 domains
    const canonical = WWW_CANONICAL[url.hostname];
    if (canonical) {
      const target = `${url.protocol}//${canonical}${url.pathname}${url.search}${url.hash}`;
      return new Response(null, {
        status: 301,
        headers: { 'Location': target },
      });
    }

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

      // Redirect legacy WordPress URLs to new locations (301)
      const enLegacyRedirect = getLegacyRedirect(url.pathname, '');
      if (enLegacyRedirect) {
        return new Response(null, {
          status: 301,
          headers: { 'Location': enLegacyRedirect + url.search + url.hash },
        });
      }

      // Redirect deprecated short-slug walking areas (EN domain)
      // e.g. /walking-area-wicklow → /walking-area-wicklow-way
      const enDeprecatedRedirect = getDeprecatedSlugRedirect(url.pathname, '');
      if (enDeprecatedRedirect) {
        return new Response(null, {
          status: 301,
          headers: { 'Location': enDeprecatedRedirect + url.search + url.hash },
        });
      }

      // Redirect old prefixes: /destination-* → /walking-area-*, /tours/* → /walking-tours/*
      const enOldPrefixRedirect = getOldPrefixRedirect(url.pathname, '');
      if (enOldPrefixRedirect) {
        // Chain: destination-wicklow → walking-area-wicklow → walking-area-wicklow-way
        const chainedDeprecated = getDeprecatedSlugRedirect(enOldPrefixRedirect, '');
        return new Response(null, {
          status: 301,
          headers: { 'Location': (chainedDeprecated || enOldPrefixRedirect) + url.search + url.hash },
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

      return withCacheHeaders(response, url.pathname);
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

    // Redirect legacy WordPress URLs to new locations (301)
    const langLegacyRedirect = getLegacyRedirect(cleanPath, langPrefix);
    if (langLegacyRedirect) {
      return new Response(null, {
        status: 301,
        headers: { 'Location': langLegacyRedirect + url.search + url.hash },
      });
    }

    // Translate EN slugs to the correct language (301 redirect)
    // Visitors may arrive via old links or search engines using EN URLs
    const translatedPath = translateSlug(cleanPath, langPrefix);
    if (translatedPath) {
      // Before redirecting, also check if the translated path is a deprecated short slug
      const deprecatedRedirect = getDeprecatedSlugRedirect(translatedPath, langPrefix);
      return new Response(null, {
        status: 301,
        headers: { 'Location': (deprecatedRedirect || translatedPath) + url.search + url.hash },
      });
    }

    // Redirect deprecated short-slug walking areas to their full canonical slug
    // e.g. /wandergebiet-wicklow → /wandergebiet-wicklow-way (DE)
    //      /wandelgebied-dingle → /wandelgebied-dingle-way (NL)
    const deprecatedRedirect = getDeprecatedSlugRedirect(cleanPath, langPrefix);
    if (deprecatedRedirect) {
      return new Response(null, {
        status: 301,
        headers: { 'Location': deprecatedRedirect + url.search + url.hash },
      });
    }

    // Redirect old/retired prefixes to canonical prefixes
    // e.g. /wanderziel-wicklow-way → /wandergebiet-wicklow-way (DE)
    //      /wandelbestemming-kerry-way → /wandelgebied-kerry-way (NL)
    const oldPrefixRedirect = getOldPrefixRedirect(cleanPath, langPrefix);
    if (oldPrefixRedirect) {
      // Also check if the redirected path uses a deprecated short slug
      const chainedDeprecated = getDeprecatedSlugRedirect(oldPrefixRedirect, langPrefix);
      return new Response(null, {
        status: 301,
        headers: { 'Location': (chainedDeprecated || oldPrefixRedirect) + url.search + url.hash },
      });
    }

    // Rewrite URL: prepend language directory
    // Note: Do NOT append /index.html explicitly — Cloudflare Pages resolves
    // directory indexes automatically. Appending it triggers Pages' pretty-URL
    // redirect (/de/index.html → /de/) which the Location-stripping logic below
    // turns into / → creating an infinite redirect loop on language domains.
    const rewrittenPath = langPrefix + cleanPath;
    const rewrittenUrl = new URL(url);
    rewrittenUrl.pathname = rewrittenPath;

    const response = await env.ASSETS.fetch(
      new Request(rewrittenUrl.toString(), {
        method: request.method,
        headers: request.headers,
        redirect: 'manual',  // Return _redirects 301s as-is; don't follow internally
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
            const strippedPath = locUrl.pathname.slice(langPrefix.length);
            // Safety: if stripping would redirect back to the same cleanPath,
            // serve the content instead of redirecting (prevents redirect loops,
            // e.g. /de/ → / on the homepage).
            if (strippedPath === cleanPath || strippedPath === cleanPath + '/') {
              // Re-fetch without redirect: 'manual' to get actual content
              const retryResp = await env.ASSETS.fetch(
                new Request(rewrittenUrl.toString(), {
                  method: request.method,
                  headers: request.headers,
                })
              );
              return retryResp;
            }
            locUrl.pathname = strippedPath;
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

    return withCacheHeaders(response, url.pathname);
  },
};
