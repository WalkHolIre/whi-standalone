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
    const rewrittenPath = langPrefix + (cleanPath === '/' ? '/index.html' : cleanPath);
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
