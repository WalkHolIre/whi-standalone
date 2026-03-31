# Walking Holiday Ireland — B2C Website (whi-standalone)

## Golden Rule
**Supabase is the single source of truth (SSOT).** Never edit generated HTML files directly — they get overwritten on every build. All content changes go through Supabase first, then build.py regenerates HTML.

## Architecture

### Three Domains, One Codebase
- **walkingholidayireland.com** — English (root `/`)
- **walkingholidayireland.de** — German (`/de/` subdirectory)
- **wandelvakantieierland.nl** — Dutch (`/nl/` subdirectory)

All three are custom domains on the **Cloudflare Pages** project "whi-standalone". The `_worker.js` handles ALL routing for ALL domains.

### Build Pipeline
1. Content lives in **Supabase** (project ID: `dfguqecbcbbgrttfkwfr`)
2. `build.py` fetches from Supabase REST API, generates static HTML into repo root (EN), `/de/` (German), `/nl/` (Dutch)
3. GitHub Actions `publish.yml` (workflow_dispatch) runs build.py, commits, pushes to `main`
4. Cloudflare Pages auto-deploys from `main` branch

### Translation Sources in Supabase
Two sources, inline takes priority:
1. **Inline `_de`/`_nl` columns** on tours/destinations tables (e.g. `name_de`, `description_de`)
2. **`tour_translations` / `destination_translations`** tables (fallback)

`build.py` calls `extract_inline_translation()` → `merge_translations()` → `apply_tour_translation()`.

### URL Routing (_worker.js)
The Cloudflare Pages worker handles everything:
- **Domain detection**: `DOMAIN_LANG` maps hostname → language prefix
- **Slug translation**: `SLUG_MAP` for static pages (e.g. `/about` → `/ueber-uns`)
- **Prefix translation**: `PREFIX_MAP` (e.g. `walking-area-` → `wandergebiet-`)
- **Deprecated short slugs**: `DEPRECATED_SHORT_SLUGS` (e.g. `wicklow` → `wicklow-way`)
- **Old prefix redirects**: `OLD_PREFIX_MAP` (e.g. `destination-` → `walking-area-`, `wanderziel-` → `wandergebiet-`)
- **Asset rewriting**: Prepends `/de/` or `/nl/` before calling `env.ASSETS.fetch()`
- **Redirect header rewriting**: Strips `/de/` or `/nl/` from Location headers so browser URL stays clean

### Key Constants That Must Stay in Sync
These exist in BOTH `_worker.js` AND `build.py` and must match:
- `DEPRECATED_SHORT_SLUGS` ↔ `DEPRECATED_DEST_SLUGS`
- `WA_PREFIX_MAP` ↔ `WALKING_AREA_PREFIX`
- `PREFIX_MAP` tour folders ↔ `TOUR_FOLDER`
- `SLUG_MAP` static pages ↔ `STATIC_SLUG_MAP`

### _redirects File
- Manually maintained sections (1-11): WordPress legacy URLs, blog redirects, destination renames
- Auto-generated section at bottom: `previous_slug` redirects from Supabase tour data (build.py writes these)
- `/de/` and `/nl/` prefixed rules ARE needed for `previous_slug` redirects (the worker passes these through to `env.ASSETS.fetch`)
- `/tours/` prefix is handled by the worker — not in `_redirects`

### Shared Assets
CSS, JS, images, fonts are served from root for all domains. `isSharedAsset()` in the worker checks `SHARED_PREFIXES` (`/css/`, `/js/`, `/images/`, `/admin/`, `/fonts/`, `/favicon`, `/_`).

Client-side JS files (e.g. `js/whi-dest-tours.js`) must use runtime language detection from `<html lang="">`, not hardcoded URLs.

## Git Repos
- **whi-standalone** — B2C website (this repo). Branches: `staging`, `main`. Cloudflare deploys from `main`.
- **whi-ground-control** — Admin CMS (Next.js). Branch: `main`.

## Ahrefs Project IDs
- WHI MAIN EN: `4511705`
- WHI GERMAN: `9421974`
- WHI Dutch: `4511706`

## Known Issues / Technical Debt
- 13 DE tour pages still need German translations in Supabase inline `_de` columns
- NL 404s for EN blog slugs: 5 URLs that can't be fixed via `_redirects`
- Most tours/destinations have NULL `hero_image` in Supabase (using fallback chain to kerry-hero.jpg)
- `whi-domain-router` Worker still exists in Cloudflare account (orphaned, no routes point to it — can be deleted)
- Schema.org validation errors on ~130 pages (EN), ~30 pages (NL)

## Build Log
Detailed session-by-session changelog: `admin/AG-ground-control/Claude-Build-Log.xml`
