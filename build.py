#!/usr/bin/env python3
"""
Walking Holiday Ireland — Pre-render Build System
==================================================
Fetches content from Supabase and generates static HTML pages from templates.

Database schema (WHI Ground Control):
  - tours: name, slug, subtitle, overview, description, highlights, itinerary (jsonb),
           whats_included, whats_not_included, difficulty_level, duration_days,
           price_per_person_eur, best_months (text[]), hero_image, meta_title, seo_description
  - destinations: name, slug, short_description, overview, description, landscape_description,
           cultural_highlights, difficulty_overview, practical_info, best_months (text[]),
           hero_image, points_of_interest (jsonb), meta_title, seo_description
  - reviews: reviewer_name, reviewer_country, rating, title, content, tour_id, status
  - Translations live in tour_translations / destination_translations tables
"""

import json
import os
import re
import sys
import urllib.request
import urllib.error
from datetime import datetime
from pathlib import Path
from html import escape

# Configuration
SUPABASE_URL = os.getenv('SUPABASE_URL', 'https://dfguqecbcbbgrttfkwfr.supabase.co')
SUPABASE_KEY = os.getenv('SUPABASE_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmZ3VxZWNiY2JiZ3J0dGZrd2ZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3ODY1OTEsImV4cCI6MjA4ODM2MjU5MX0.ckTn_XP0wKdxTK_KELaEq-02gcmSyaBGdA2iAfBuVIk')
WEBSITE_DIR = Path(__file__).parent
DRY_RUN = '--dry-run' in sys.argv
VERBOSE = '--verbose' in sys.argv or '-v' in sys.argv
LOCAL_MODE = '--local' in sys.argv

# Track generation
generated = {
    'tours': [],
    'destinations': [],
    'errors': []
}


def log(msg, level='info'):
    """Simple logging with level prefix."""
    levels = {'info': '✓', 'warn': '⚠', 'error': '✗', 'debug': '→'}
    prefix = levels.get(level, '•')
    if level != 'debug' or VERBOSE:
        print(f"{prefix} {msg}")


def fetch_supabase(table, filters=None):
    """Fetch data from Supabase REST API."""
    try:
        query = f"{SUPABASE_URL}/rest/v1/{table}?select=*"
        if filters:
            query += filters

        req = urllib.request.Request(
            query,
            headers={
                'apikey': SUPABASE_KEY,
                'Authorization': f'Bearer {SUPABASE_KEY}',
            }
        )

        with urllib.request.urlopen(req, timeout=10) as response:
            return json.loads(response.read())
    except urllib.error.HTTPError as e:
        log(f"HTTP Error fetching {table}: {e.code} {e.reason}", 'error')
        if e.code == 401:
            log("Check SUPABASE_KEY is set correctly", 'warn')
        return []
    except Exception as e:
        log(f"Error fetching {table}: {e}", 'error')
        return []


def get_safe_text(obj, key, default=''):
    """Safely get text from object, defaulting to empty string."""
    return obj.get(key) or default


def strip_html_tags(text):
    """Remove HTML tags from text for schema markup."""
    if not text:
        return ''
    return re.sub(r'<[^>]+>', '', str(text))


def render_highlights(highlights_text):
    """Convert highlights text (newline-separated) to HTML cards."""
    if not highlights_text:
        return ""

    # Handle both JSON array and plain text formats
    try:
        highlights = json.loads(highlights_text) if isinstance(highlights_text, str) and highlights_text.startswith('[') else None
    except (json.JSONDecodeError, TypeError):
        highlights = None

    if highlights is None:
        # Split by newlines for plain text
        highlights = [h.strip().lstrip('- ').lstrip('* ') for h in str(highlights_text).split('\n') if h.strip()]

    html = ""
    for highlight in highlights:
        if not highlight:
            continue
        html += f"""        <div class="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <div class="flex items-start gap-3 mb-3">
                <span class="material-symbols-outlined text-primary text-2xl">check_circle</span>
                <h3 class="font-bold text-lg leading-tight">{escape(str(highlight))}</h3>
            </div>
        </div>
"""
    return html


def render_itinerary(itinerary_data):
    """Convert itinerary JSONB to HTML day cards."""
    if not itinerary_data:
        return ""

    try:
        days = json.loads(itinerary_data) if isinstance(itinerary_data, str) else itinerary_data
    except (json.JSONDecodeError, TypeError):
        return ""

    if not isinstance(days, list):
        return ""

    html = ""
    for idx, day in enumerate(days, 1):
        title = escape(str(day.get('title', f'Day {idx}')))
        description = escape(str(day.get('description', '')))
        distance = day.get('distance', day.get('distance_km', ''))
        ascent = day.get('ascent', day.get('ascent_m', ''))
        terrain = day.get('terrain', '')

        badge_class = "bg-primary/10 text-primary" if idx == 1 else "bg-slate-100 text-slate-500"
        open_attr = "open" if idx == 1 else ""

        html += f"""        <details class="group bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden" {open_attr}>
            <summary class="flex cursor-pointer items-center justify-between p-6 hover:bg-slate-50 transition-colors">
                <div class="flex items-center gap-4">
                    <div class="flex flex-col items-center justify-center w-12 h-12 rounded-lg {badge_class} font-bold">
                        <span class="text-xs uppercase">Day</span>
                        <span class="text-xl leading-none">{idx}</span>
                    </div>
                    <div>
                        <h3 class="text-lg font-bold">{title}</h3>
                    </div>
                </div>
                <span class="material-symbols-outlined text-slate-400 group-open:rotate-180 transition-transform duration-300">expand_more</span>
            </summary>
            <div class="px-6 pb-6 pt-2 border-t border-slate-100">
                <div class="flex flex-wrap gap-3 mb-4">
"""

        if distance:
            html += f"""                    <span class="flex items-center gap-1.5 text-sm font-medium text-slate-500 bg-slate-100 px-3 py-1.5 rounded-md">
                        <span class="material-symbols-outlined text-[18px]">straighten</span> {escape(str(distance))}km
                    </span>
"""
        if ascent:
            html += f"""                    <span class="flex items-center gap-1.5 text-sm font-medium text-slate-500 bg-slate-100 px-3 py-1.5 rounded-md">
                        <span class="material-symbols-outlined text-[18px]">terrain</span> {escape(str(ascent))}m ascent
                    </span>
"""

        html += f"""                </div>
                <p class="text-slate-600 leading-relaxed">
                    {description}
                </p>
            </div>
        </details>
"""

    return html


def render_best_months(best_months):
    """Convert best_months text array to month pill HTML."""
    if not best_months:
        return ""

    # Handle Postgres text array format
    if isinstance(best_months, str):
        # Parse {May,June,September} format from Postgres
        cleaned = best_months.strip('{}')
        best_months_list = [m.strip().strip('"') for m in cleaned.split(',') if m.strip()]
    elif isinstance(best_months, list):
        best_months_list = best_months
    else:
        return ""

    month_names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    full_month_names = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

    html = """    <div class="grid grid-cols-1 gap-6">
        <p class="text-lg text-slate-600 leading-relaxed">
            Choose your ideal season based on weather, crowds, and daylight hours.
        </p>
        <div class="grid grid-cols-6 sm:grid-cols-12 gap-2">
"""

    for month_idx in range(12):
        month_short = month_names[month_idx]
        month_full = full_month_names[month_idx]
        # Match against both short and full month names
        is_best = any(m.lower().startswith(month_full[:3].lower()) for m in best_months_list)

        if is_best:
            html += f"""            <div class="text-center p-3 rounded-lg bg-primary/10 text-primary border border-primary/30"><span class="text-xs font-bold block">{month_short}</span><span class="material-symbols-outlined text-sm">star</span></div>
"""
        else:
            html += f"""            <div class="text-center p-3 rounded-lg bg-slate-100 text-slate-400"><span class="text-xs font-bold block">{month_short}</span><span class="material-symbols-outlined text-sm">check</span></div>
"""

    html += """        </div>
        <p class="text-sm text-slate-500"><span class="text-primary font-bold">★</span> = Best months &nbsp; <span class="text-slate-500 font-bold">✓</span> = Available</p>
    </div>
"""

    return html


def compute_review_stats(reviews_list):
    """Compute aggregate review statistics."""
    if not reviews_list:
        return {'total': 0, 'avg': 0, 'breakdown': {5: 0, 4: 0, 3: 0, 2: 0, 1: 0}}

    total = len(reviews_list)
    avg = sum(r.get('rating', 5) for r in reviews_list) / total
    breakdown = {}
    for star in range(5, 0, -1):
        breakdown[star] = sum(1 for r in reviews_list if r.get('rating') == star)

    return {'total': total, 'avg': round(avg, 1), 'breakdown': breakdown}


def render_star_icons(rating, size='text-lg'):
    """Render star rating icons."""
    full_stars = int(rating)
    html = ''
    for i in range(full_stars):
        html += f'<span class="material-symbols-outlined {size} text-primary">star</span>'
    for i in range(5 - full_stars):
        html += f'<span class="material-symbols-outlined {size} text-slate-300">star</span>'
    return html


def render_review_card(review, tour_name='', show_tour=False, prefix=''):
    """Render a single review card."""
    name = escape(review.get('reviewer_name') or 'Guest')
    country = escape(review.get('reviewer_country') or '')
    rating = review.get('rating', 5) or 5
    title = escape(review.get('title') or '')
    content = escape(review.get('review_text_en') or review.get('content') or '')
    travel_period = escape(review.get('travel_period') or '')
    whi_response = review.get('whi_response') or ''

    stars = render_star_icons(rating)
    initial = name[0] if name else 'G'

    # Truncate content for card display (show first 200 chars)
    truncated = content[:200] + '...' if len(content) > 200 else content
    needs_expand = len(content) > 200

    tour_line = ''
    if show_tour and tour_name:
        tour_line = f'<p class="text-sm text-primary font-semibold mt-1">{escape(tour_name)}</p>'

    meta_parts = [country, travel_period]
    meta_text = ' · '.join(p for p in meta_parts if p)

    expand_html = ''
    if needs_expand:
        expand_html = f"""
                <div class="review-full hidden mt-2">
                    <p class="text-slate-600 leading-relaxed">{content}</p>
                </div>
                <button class="review-toggle text-primary font-semibold text-sm mt-2 hover:underline" onclick="this.previousElementSibling.classList.toggle('hidden'); this.textContent = this.textContent === 'Read more' ? 'Show less' : 'Read more'">Read more</button>"""

    response_html = ''
    if whi_response:
        response_html = f"""
                <div class="mt-4 pt-4 border-t border-slate-100">
                    <p class="text-sm font-semibold text-brand-purple mb-1">Walking Holiday Ireland responded:</p>
                    <p class="text-sm text-slate-500 italic">{escape(whi_response)}</p>
                </div>"""

    html = f"""        <div class="review-card bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-200 flex-shrink-0 w-full md:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)]" data-tour="{escape(review.get('tour_id', ''))}" data-dest="{escape(review.get('destination_id', ''))}" data-rating="{rating}">
                <div class="flex items-center gap-4 mb-4">
                    <div class="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-white font-bold text-lg">{initial}</div>
                    <div>
                        <h4 class="font-bold text-lg">{name}</h4>
                        <p class="text-sm text-slate-500">{meta_text}</p>{tour_line}
                    </div>
                </div>
                <div class="flex mb-3">{stars}</div>
                <h5 class="font-bold mb-2">{title}</h5>
                <p class="review-truncated text-slate-600 leading-relaxed">{truncated}</p>{expand_html}{response_html}
            </div>
"""
    return html


def render_review_carousel(reviews_list, tours_by_id, carousel_id, heading, show_tour=True, link_url='', link_text='', prefix=''):
    """Render a horizontal review carousel section."""
    if not reviews_list:
        return ""

    # Sort: featured first, then by rating desc, date desc
    sorted_reviews = sorted(reviews_list, key=lambda r: (
        not r.get('featured', False),
        -(r.get('rating', 0)),
        r.get('review_date', '') or ''
    ))

    # Stats
    stats = compute_review_stats(reviews_list)
    stars_html = render_star_icons(stats['avg'])

    # Build carousel cards
    cards_html = ""
    for review in sorted_reviews:
        tour_id = review.get('tour_id')
        tour = tours_by_id.get(tour_id, {})
        tour_name = tour.get('name', '')
        cards_html += render_review_card(review, tour_name=tour_name, show_tour=show_tour, prefix=prefix)

    # Dots (one per "page" of 3 cards)
    num_pages = max(1, -(-len(sorted_reviews) // 3))  # Ceiling division
    dots_html = ''
    for i in range(min(num_pages, 8)):  # Max 8 dots
        active = 'bg-primary' if i == 0 else 'bg-slate-300'
        dots_html += f'<button class="carousel-dot w-2.5 h-2.5 rounded-full {active} transition-colors" data-page="{i}"></button>\n'

    link_html = ''
    if link_url and link_text:
        link_html = f'<a href="{link_url}" class="inline-flex items-center gap-1 text-primary font-semibold hover:underline mt-4">{link_text} <span class="material-symbols-outlined text-lg">arrow_forward</span></a>'

    html = f"""<div id="{carousel_id}" class="review-carousel" data-auto-advance="8000">
        <div class="flex items-center gap-3 mb-2">
            <div class="w-1.5 h-8 bg-primary rounded-full"></div>
            <h2 class="text-3xl md:text-4xl font-black text-brand-purple">{heading}</h2>
        </div>
        <div class="flex items-center gap-3 mb-8">
            <div class="flex">{stars_html}</div>
            <span class="text-lg font-bold text-slate-700">{stats['avg']}</span>
            <span class="text-slate-500">·</span>
            <span class="text-slate-500">{stats['total']} reviews</span>
        </div>
        <div class="relative">
            <div class="carousel-track flex gap-6 overflow-x-auto scroll-smooth snap-x snap-mandatory hide-scrollbar pb-4">
{cards_html}            </div>
            <button class="carousel-prev absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 w-10 h-10 bg-white rounded-full shadow-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors hidden md:flex z-10">
                <span class="material-symbols-outlined">chevron_left</span>
            </button>
            <button class="carousel-next absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 w-10 h-10 bg-white rounded-full shadow-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors hidden md:flex z-10">
                <span class="material-symbols-outlined">chevron_right</span>
            </button>
        </div>
        <div class="flex items-center justify-center gap-2 mt-6">
{dots_html}        </div>
        <div class="text-center mt-2">
            {link_html}
        </div>
    </div>
"""
    return html


def render_review_stats_bar(stats):
    """Render aggregate review stats with bar chart."""
    if stats['total'] == 0:
        return ""

    stars_html = render_star_icons(stats['avg'], 'text-2xl')
    max_count = max(stats['breakdown'].values()) if stats['breakdown'] else 1

    bars_html = ""
    for star in range(5, 0, -1):
        count = stats['breakdown'].get(star, 0)
        pct = (count / max_count * 100) if max_count > 0 else 0
        bars_html += f"""            <div class="flex items-center gap-3">
                <span class="text-sm font-semibold text-slate-600 w-16">{star} star{'s' if star != 1 else ''}</span>
                <div class="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
                    <div class="bg-primary h-full rounded-full transition-all" style="width: {pct}%"></div>
                </div>
                <span class="text-sm text-slate-500 w-8 text-right">{count}</span>
            </div>
"""

    html = f"""    <div class="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
        <div class="flex flex-col md:flex-row md:items-center gap-6 md:gap-10">
            <div class="flex flex-col items-center">
                <span class="text-5xl font-black text-brand-purple">{stats['avg']}</span>
                <div class="flex mt-2">{stars_html}</div>
                <span class="text-slate-500 mt-1">{stats['total']} reviews</span>
            </div>
            <div class="flex-1 space-y-2">
{bars_html}            </div>
        </div>
    </div>
"""
    return html


def render_review_schema(reviews_list, entity_name, entity_description='', schema_type='Product'):
    """Render review structured data (Product or LocalBusiness with AggregateRating)."""
    if not reviews_list:
        return ""

    stats = compute_review_stats(reviews_list)

    # Build individual review items (max 10, featured first)
    sorted_reviews = sorted(reviews_list, key=lambda r: (
        not r.get('featured', False),
        -(r.get('rating', 0))
    ))[:10]

    review_items = []
    for review in sorted_reviews:
        item = {
            "@type": "Review",
            "author": {
                "@type": "Person",
                "name": review.get('reviewer_name', 'Guest')
            },
            "reviewRating": {
                "@type": "Rating",
                "ratingValue": str(review.get('rating', 5)),
                "bestRating": "5"
            },
            "reviewBody": strip_html_tags(review.get('review_text_en') or review.get('content', ''))[:500]
        }
        if review.get('review_date'):
            item["datePublished"] = str(review['review_date'])
        review_items.append(item)

    schema = {
        "@context": "https://schema.org",
        "@type": schema_type,
        "name": entity_name,
        "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": str(stats['avg']),
            "bestRating": "5",
            "worstRating": "1",
            "reviewCount": str(stats['total'])
        },
        "review": review_items
    }

    if entity_description:
        schema["description"] = entity_description

    if schema_type == 'Product':
        schema["brand"] = {
            "@type": "Brand",
            "name": "Walking Holiday Ireland"
        }
    elif schema_type == 'LocalBusiness':
        schema["url"] = "https://walkingholidayireland.com"
        schema["address"] = {
            "@type": "PostalAddress",
            "addressLocality": "Dundalk",
            "addressRegion": "Co. Louth",
            "addressCountry": "IE"
        }

    html = f'    <script type="application/ld+json">\n{json.dumps(schema, indent=8)}\n    </script>\n'
    return html


def render_tour_review_section(reviews_list, tour, tours_by_id, prefix='../'):
    """Render review carousel section for tour pages."""
    if not reviews_list:
        return ""

    tour_name = escape(tour.get('name', ''))
    heading = f"What Our Walkers Say"

    carousel_html = render_review_carousel(
        reviews_list, tours_by_id,
        carousel_id="tour-reviews",
        heading=heading,
        show_tour=False,
        link_url=f"{prefix}reviews.html",
        link_text=f"Read all {len(reviews_list)} reviews",
        prefix=prefix
    )

    return carousel_html


def render_destination_review_section(reviews_list, destination, tours_by_id, prefix=''):
    """Render review carousel section for destination pages."""
    if not reviews_list:
        return ""

    dest_name = escape(destination.get('name', ''))
    heading = f"What Our Walkers Say"

    carousel_html = render_review_carousel(
        reviews_list, tours_by_id,
        carousel_id="dest-reviews",
        heading=heading,
        show_tour=True,
        link_url=f"{prefix}reviews.html",
        link_text=f"Read all {len(reviews_list)} reviews",
        prefix=prefix
    )

    return carousel_html


def render_tour_cards(tours, prefix='tours/'):
    """Render tour card HTML for destination pages.

    Args:
        tours: List of tour dictionaries
        prefix: URL prefix for links. Use 'tours/' for root pages, '' for tour pages
    """
    if not tours:
        return ""

    html = ""
    for tour in tours:
        slug = tour.get('slug', '')
        name = escape(tour.get('name', ''))
        difficulty = escape(tour.get('difficulty_level', ''))
        days = tour.get('duration_days', 0)
        price = tour.get('price_per_person_eur', 0)
        # Clean up price display (remove trailing .00)
        try:
            price_val = float(price) if price else 0
            price_display = f"{price_val:.0f}" if price_val == int(price_val) else f"{price_val:.2f}"
        except (ValueError, TypeError):
            price_display = str(price)

        html += f"""            <a href="{prefix}{slug}.html" class="group bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-xl transition-all">
                <div class="aspect-[4/3] overflow-hidden bg-slate-100">
                    <img src="images/routes/{slug}/card.jpg" srcset="images/routes/{slug}/card-400w.jpg 400w, images/routes/{slug}/card-800w.jpg 800w, images/routes/{slug}/card.jpg 1200w" sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" alt="{name}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" width="1200" height="800" onerror="this.parentElement.style.background='linear-gradient(135deg, #f17e00 0%, #210747 100%)'"/>
                </div>
                <div class="p-5">
                    <h3 class="font-bold text-lg mb-1">{name}</h3>
                    <p class="text-sm text-slate-500 mb-3">{difficulty} · {days} Days</p>
                    <span class="text-primary font-bold">From &euro;{price_display} pp &rarr;</span>
                </div>
            </a>
"""

    return html


def render_poi_grid(points_of_interest):
    """Render points of interest grid HTML."""
    if not points_of_interest:
        return ""

    try:
        pois = json.loads(points_of_interest) if isinstance(points_of_interest, str) else points_of_interest
    except (json.JSONDecodeError, TypeError):
        return ""

    if not isinstance(pois, list):
        return ""

    html = ""
    for poi in pois:
        title = escape(poi.get('name', ''))
        description = escape(poi.get('description', ''))

        html += f"""            <div class="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-lg transition-all">
                <div class="flex items-start gap-3 mb-3">
                    <span class="material-symbols-outlined text-primary text-2xl">location_on</span>
                    <h3 class="font-bold text-lg">{title}</h3>
                </div>
                <p class="text-slate-600 text-sm leading-relaxed">{description}</p>
            </div>
"""

    return html


def render_faq_accordion_item(faq):
    """Render a single FAQ as a <details> element."""
    question = escape(faq.get('question', ''))
    answer = faq.get('answer', '')
    section = escape(faq.get('section', ''))

    # Create lowercase plain text versions for search
    question_lower = re.sub(r'<[^>]+>', '', question).lower()
    answer_lower = re.sub(r'<[^>]+>', '', str(answer)).lower()

    html = f"""        <details class="group bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow" data-section="{section}" data-question="{question_lower}" data-answer="{answer_lower}">
            <summary class="flex items-center justify-between px-6 py-4 font-semibold text-brand-purple cursor-pointer hover:text-primary transition-colors">
                <span>{question}</span>
                <span class="chevron material-symbols-outlined group-open:rotate-180 transition-transform">expand_more</span>
            </summary>
            <div class="px-6 pb-4 pt-2 text-slate-600 leading-relaxed">
                {answer}
            </div>
        </details>
"""
    return html


def render_faq_section(section_name, display_name, faqs_in_section):
    """Render a full FAQ section with header and accordion items."""
    accordion_html = ""
    for faq in faqs_in_section:
        accordion_html += render_faq_accordion_item(faq)

    html = f"""    <section id="faq-section-{section_name}" class="faq-section" data-section="{section_name}">
        <div class="flex items-center gap-3 mb-8">
            <div class="w-1.5 h-8 bg-primary rounded-full"></div>
            <h2 class="text-[1.75rem] font-black text-brand-purple">{escape(display_name)}</h2>
        </div>
        <div class="space-y-3">
{accordion_html}        </div>
    </section>

"""
    return html


def render_all_faq_sections(faqs):
    """Group FAQs by section in display order and render all sections."""
    section_order = [
        ('booking', 'Booking & Payment'),
        ('tours', 'Tours & What\'s Included'),
        ('accommodation', 'Accommodation'),
        ('transport', 'Transport & Transfers'),
        ('general', 'General'),
        ('equipment', 'Gear & Packing'),
        ('weather', 'Weather'),
        ('safety', 'Navigation & Safety'),
        ('insurance', 'Insurance'),
        ('destinations', 'Destinations'),
    ]

    # Group FAQs by section
    faqs_by_section = {}
    for faq in faqs:
        section = faq.get('section', 'general')
        if section not in faqs_by_section:
            faqs_by_section[section] = []
        faqs_by_section[section].append(faq)

    # Render sections in order
    html = ""
    for section_key, display_name in section_order:
        if section_key in faqs_by_section:
            html += render_faq_section(section_key, display_name, faqs_by_section[section_key])

    return html


def render_faq_section_tabs(faqs):
    """Render section filter tabs (pill buttons)."""
    section_order = [
        ('booking', 'Booking'),
        ('tours', 'Tours'),
        ('accommodation', 'Accommodation'),
        ('transport', 'Transport'),
        ('general', 'General'),
        ('equipment', 'Gear & Packing'),
        ('weather', 'Weather'),
        ('safety', 'Safety'),
        ('insurance', 'Insurance'),
        ('destinations', 'Destinations'),
    ]

    # Count FAQs by section
    section_counts = {}
    total = len(faqs)
    for faq in faqs:
        section = faq.get('section', 'general')
        section_counts[section] = section_counts.get(section, 0) + 1

    html = '    <div id="faq-tabs" class="flex flex-wrap gap-2 mb-12">\n'
    html += f'        <button class="faq-tab active px-4 py-2 rounded-full text-sm font-semibold bg-primary text-white transition-all" data-section="all">All ({total})</button>\n'

    for section_key, display_name in section_order:
        if section_key in section_counts:
            count = section_counts[section_key]
            html += f'        <button class="faq-tab px-4 py-2 rounded-full text-sm font-semibold bg-white text-slate-600 border border-slate-200 hover:border-primary hover:text-primary transition-all" data-section="{section_key}">{escape(display_name)} ({count})</button>\n'

    html += '    </div>\n'
    return html


def render_faq_schema(faqs, max_items=10):
    """Render FAQPage JSON-LD schema for Google rich results."""
    if not faqs:
        return ""

    # Prioritize sections: booking and tours first, then others
    section_priority = ['booking', 'tours', 'transport', 'general', 'equipment', 'accommodation', 'weather', 'safety', 'insurance', 'destinations']

    # Sort by section priority, then by sort_order
    sorted_faqs = sorted(faqs, key=lambda x: (
        section_priority.index(x.get('section', 'general')) if x.get('section', 'general') in section_priority else 999,
        x.get('sort_order', 0)
    ))

    # Take first max_items
    faqs_for_schema = sorted_faqs[:max_items]

    # Build FAQ items
    faq_items = []
    for faq in faqs_for_schema:
        question = escape(strip_html_tags(faq.get('question', '')))
        answer = strip_html_tags(faq.get('answer', ''))

        faq_items.append({
            "@type": "Question",
            "name": question,
            "acceptedAnswer": {
                "@type": "Answer",
                "text": answer
            }
        })

    schema = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": faq_items
    }

    html = f'    <script type="application/ld+json">\n{json.dumps(schema, indent=8)}\n    </script>\n'
    return html


def render_tour_faq_section(tour_id, faqs, tour_name):
    """Render FAQ section for tour pages with curation logic."""
    if not tour_id or not faqs:
        return "", []

    # Filter FAQs for this tour
    tour_faqs = [f for f in faqs if tour_id in f.get('tour_ids', [])]

    if not tour_faqs:
        return "", []

    # Curate max 8: prioritize route-specific FAQs first
    section_order = ['tours', 'transport', 'general', 'equipment', 'accommodation', 'booking', 'safety', 'insurance']

    # Separate route-specific (fewer than 16 tour_ids) and general FAQs
    route_specific = [f for f in tour_faqs if len(f.get('tour_ids', [])) < 16]
    general = [f for f in tour_faqs if len(f.get('tour_ids', [])) >= 16]

    # Sort by section order and sort_order
    def sort_key(faq):
        section = faq.get('section', 'general')
        section_idx = section_order.index(section) if section in section_order else 999
        return (section_idx, faq.get('sort_order', 0))

    route_specific.sort(key=sort_key)
    general.sort(key=sort_key)

    # Combine: route-specific first, then general
    curated_faqs = (route_specific + general)[:8]

    if not curated_faqs:
        return "", []

    # Render accordion items
    accordion_html = ""
    for faq in curated_faqs:
        accordion_html += render_faq_accordion_item(faq)

    # Build section HTML
    html = f"""    <section class="faq-section">
        <div class="flex items-center gap-3 mb-8">
            <div class="w-1.5 h-8 bg-primary rounded-full"></div>
            <h2 class="text-[1.75rem] font-black text-brand-purple">Frequently Asked Questions</h2>
        </div>
        <div class="space-y-3">
{accordion_html}        </div>
        <p class="text-sm text-slate-500 mt-6">Showing {len(curated_faqs)} of {len(tour_faqs)} FAQs · <a href="../faq.html" class="text-primary font-semibold hover:underline">View all FAQs</a></p>
    </section>

"""
    return html, curated_faqs


def render_destination_faq_section(dest_id, faqs, dest_name):
    """Render FAQ section for destination pages with curation logic."""
    if not dest_id or not faqs:
        return "", []

    # Filter FAQs for this destination
    dest_faqs = [f for f in faqs if dest_id in f.get('destination_ids', [])]

    if not dest_faqs:
        return "", []

    # Curate max 8: same logic as tours
    section_order = ['tours', 'transport', 'general', 'equipment', 'accommodation', 'booking', 'safety', 'insurance']

    # Separate route-specific (fewer than 16 destination_ids) and general FAQs
    route_specific = [f for f in dest_faqs if len(f.get('destination_ids', [])) < 16]
    general = [f for f in dest_faqs if len(f.get('destination_ids', [])) >= 16]

    # Sort by section order and sort_order
    def sort_key(faq):
        section = faq.get('section', 'general')
        section_idx = section_order.index(section) if section in section_order else 999
        return (section_idx, faq.get('sort_order', 0))

    route_specific.sort(key=sort_key)
    general.sort(key=sort_key)

    # Combine: route-specific first, then general
    curated_faqs = (route_specific + general)[:8]

    if not curated_faqs:
        return "", []

    # Render accordion items
    accordion_html = ""
    for faq in curated_faqs:
        accordion_html += render_faq_accordion_item(faq)

    # Build section HTML
    html = f"""    <section class="faq-section">
        <div class="flex items-center gap-3 mb-8">
            <div class="w-1.5 h-8 bg-primary rounded-full"></div>
            <h2 class="text-[1.75rem] font-black text-brand-purple">Frequently Asked Questions</h2>
        </div>
        <div class="space-y-3">
{accordion_html}        </div>
        <p class="text-sm text-slate-500 mt-6">Showing {len(curated_faqs)} of {len(dest_faqs)} FAQs · <a href="faq.html" class="text-primary font-semibold hover:underline">View all FAQs</a></p>
    </section>

"""
    return html, curated_faqs


def render_tour_page(tour, destination, related_tours, reviews, faqs, tours_by_id):
    """Render a tour page from template."""
    template_path = WEBSITE_DIR / '_templates' / 'tour.html'

    if not template_path.exists():
        log(f"Template not found: {template_path}", 'error')
        return None

    with open(template_path, 'r') as f:
        template = f.read()

    # Prepare data
    highlights_html = render_highlights(tour.get('highlights'))
    itinerary_html = render_itinerary(tour.get('itinerary'))
    best_months_html = render_best_months(tour.get('best_months'))
    reviews_html = render_tour_review_section(reviews, tour, tours_by_id, prefix='../')
    review_schema_html = render_tour_page_schema(tour, reviews)
    # Use empty prefix for tour pages (already in tours/ subdirectory)
    related_html = render_tour_cards(related_tours, prefix='')

    # FAQ data
    tour_faq_html, tour_faq_list = render_tour_faq_section(tour.get('id'), faqs, tour.get('name', ''))
    tour_faq_schema = render_faq_schema(tour_faq_list, max_items=8)

    # Price display
    price = tour.get('price_per_person_eur', 0)
    try:
        price_val = float(price) if price else 0
        price_display = f"{price_val:.0f}" if price_val == int(price_val) else f"{price_val:.2f}"
    except (ValueError, TypeError):
        price_display = str(price)

    # Destination info
    dest_name = destination.get('name', '') if destination else ''
    dest_slug = destination.get('slug', '') if destination else ''

    # Build placeholders
    replacements = {
        '{meta_title}': escape(tour.get('meta_title') or tour.get('name', '')),
        '{meta_description}': escape(tour.get('seo_description') or tour.get('short_description', '')),
        '{tour_name}': escape(tour.get('name', '')),
        '{subtitle}': escape(tour.get('subtitle', '')),
        '{hero_image}': escape(tour.get('hero_image') or f'images/routes/{tour.get("slug", "")}/hero.jpg'),
        '{difficulty_level}': escape(tour.get('difficulty_level', '')),
        '{duration_days}': str(tour.get('duration_days', 0)),
        '{walking_days}': str(max(0, (tour.get('duration_days', 0) or 0) - 1)),
        '{price_per_person_eur}': price_display,
        '{description}': get_safe_text(tour, 'description'),
        '{overview}': get_safe_text(tour, 'overview'),
        '{short_description}': get_safe_text(tour, 'short_description'),
        '{highlights}': highlights_html,
        '{who_is_it_for}': get_safe_text(tour, 'who_is_it_for') or get_safe_text(tour, 'overview'),
        '{itinerary_html}': itinerary_html,
        '{accommodation_description}': get_safe_text(tour, 'accommodation_description') or get_safe_text(tour, 'whats_included'),
        '{whats_included}': get_safe_text(tour, 'whats_included'),
        '{whats_not_included}': get_safe_text(tour, 'whats_not_included'),
        '{best_months_html}': best_months_html,
        '{reviews_html}': reviews_html,
        '{review_schema}': review_schema_html,
        '{related_tours_html}': related_html,
        '{destination_name}': escape(dest_name),
        '{destination_slug}': escape(dest_slug),
        '{tour_slug}': escape(tour.get('slug', '')),
        '{faq_section_html}': tour_faq_html,
        '{faq_schema}': tour_faq_schema,
    }

    # Apply replacements
    html = template
    for key, value in replacements.items():
        html = html.replace(key, str(value))

    return html


def render_dest_quick_stats(destination, tours):
    """Render the quick stats bar below the hero."""
    items = []
    tour_count = len(tours) if tours else 0
    if tour_count:
        items.append(f'<div class="flex items-center gap-2"><span class="material-symbols-outlined text-primary">hiking</span><span class="text-sm font-bold text-slate-700">{tour_count} Walking Tour{"s" if tour_count != 1 else ""}</span></div>')

    # Price range
    prices = []
    for t in (tours or []):
        try:
            p = float(t.get('price_per_person_eur', 0))
            if p > 0:
                prices.append(p)
        except (ValueError, TypeError):
            pass
    if prices:
        min_p = int(min(prices))
        items.append(f'<div class="flex items-center gap-2"><span class="material-symbols-outlined text-primary">euro</span><span class="text-sm font-bold text-slate-700">From &euro;{min_p} pp</span></div>')

    # Duration range
    durations = [t.get('duration_days', 0) for t in (tours or []) if t.get('duration_days')]
    if durations:
        min_d, max_d = min(durations), max(durations)
        dur_text = f"{min_d}&ndash;{max_d} Days" if min_d != max_d else f"{min_d} Days"
        items.append(f'<div class="flex items-center gap-2"><span class="material-symbols-outlined text-primary">calendar_month</span><span class="text-sm font-bold text-slate-700">{dur_text}</span></div>')

    # Difficulty levels
    difficulties = list(set(t.get('difficulty_level', '') for t in (tours or []) if t.get('difficulty_level')))
    if difficulties:
        diff_text = ' &middot; '.join(sorted(difficulties, key=lambda d: ['Easy', 'Moderate', 'Intermediate', 'Challenging'].index(d) if d in ['Easy', 'Moderate', 'Intermediate', 'Challenging'] else 99))
        items.append(f'<div class="flex items-center gap-2"><span class="material-symbols-outlined text-primary">speed</span><span class="text-sm font-bold text-slate-700">{diff_text}</span></div>')

    # Best months
    best = destination.get('best_months')
    if best and isinstance(best, list) and len(best) > 0:
        months_text = ', '.join(best[:3])
        if len(best) > 3:
            months_text += f' +{len(best) - 3}'
        items.append(f'<div class="flex items-center gap-2"><span class="material-symbols-outlined text-primary">wb_sunny</span><span class="text-sm font-bold text-slate-700">Best: {months_text}</span></div>')

    return '\n                        '.join(items)


def render_walking_info_panel(destination, tours):
    """Render the sticky walking info panel in the overview sidebar."""
    items = []

    # Difficulty
    diff = destination.get('difficulty_overview', '')
    difficulties = list(set(t.get('difficulty_level', '') for t in (tours or []) if t.get('difficulty_level')))
    if difficulties:
        diff_badges = ''
        for d in sorted(difficulties, key=lambda x: ['Easy', 'Moderate', 'Intermediate', 'Challenging'].index(x) if x in ['Easy', 'Moderate', 'Intermediate', 'Challenging'] else 99):
            badge_class = 'badge-easy' if d == 'Easy' else ('badge-moderate' if d in ('Moderate', 'Intermediate') else 'badge-challenging')
            diff_badges += f'<span class="inline-block px-3 py-1 rounded-full text-xs font-bold {badge_class}">{escape(d)}</span> '
        items.append(f'''<div class="flex items-start gap-3">
                                        <div class="info-icon bg-primary/10"><span class="material-symbols-outlined text-primary">speed</span></div>
                                        <div><p class="text-xs text-slate-500 font-medium mb-1">Difficulty</p><div class="flex flex-wrap gap-1">{diff_badges}</div></div>
                                    </div>''')

    # Duration
    durations = [t.get('duration_days', 0) for t in (tours or []) if t.get('duration_days')]
    if durations:
        min_d, max_d = min(durations), max(durations)
        dur_text = f"{min_d}&ndash;{max_d} days" if min_d != max_d else f"{min_d} days"
        items.append(f'''<div class="flex items-start gap-3">
                                        <div class="info-icon bg-primary/10"><span class="material-symbols-outlined text-primary">calendar_month</span></div>
                                        <div><p class="text-xs text-slate-500 font-medium mb-1">Duration</p><p class="text-sm font-bold text-slate-700">{dur_text}</p></div>
                                    </div>''')

    # Best months
    best = destination.get('best_months')
    if best and isinstance(best, list) and len(best) > 0:
        items.append(f'''<div class="flex items-start gap-3">
                                        <div class="info-icon bg-primary/10"><span class="material-symbols-outlined text-primary">wb_sunny</span></div>
                                        <div><p class="text-xs text-slate-500 font-medium mb-1">Best Months</p><p class="text-sm font-bold text-slate-700">{', '.join(best)}</p></div>
                                    </div>''')

    # Accommodation
    acc = destination.get('accommodation_style', '')
    if acc:
        acc_short = strip_html_tags(acc)[:80]
        if len(strip_html_tags(acc)) > 80:
            acc_short += '...'
        items.append(f'''<div class="flex items-start gap-3">
                                        <div class="info-icon bg-primary/10"><span class="material-symbols-outlined text-primary">hotel</span></div>
                                        <div><p class="text-xs text-slate-500 font-medium mb-1">Accommodation</p><p class="text-sm font-bold text-slate-700">{escape(acc_short)}</p></div>
                                    </div>''')

    # Who is it for
    who = destination.get('who_is_it_for', '')
    if who:
        who_short = strip_html_tags(who)[:80]
        if len(strip_html_tags(who)) > 80:
            who_short += '...'
        items.append(f'''<div class="flex items-start gap-3">
                                        <div class="info-icon bg-primary/10"><span class="material-symbols-outlined text-primary">group</span></div>
                                        <div><p class="text-xs text-slate-500 font-medium mb-1">Ideal For</p><p class="text-sm font-bold text-slate-700">{escape(who_short)}</p></div>
                                    </div>''')

    return '\n                                '.join(items)


def render_dest_landscape_section(destination):
    """Render the landscape section (conditional)."""
    text = destination.get('landscape_description', '')
    if not text or not text.strip():
        return ''
    return f'''<section class="w-full py-16 md:py-24 px-6 bg-slate-50">
                <div class="max-w-7xl mx-auto">
                    <div class="flex items-start gap-4 mb-8">
                        <div class="w-1.5 h-10 bg-primary rounded-full flex-shrink-0"></div>
                        <div>
                            <h2 class="text-3xl md:text-4xl font-black text-brand-purple">The Landscape</h2>
                            <p class="text-slate-500 mt-1">What to expect along the way</p>
                        </div>
                    </div>
                    <div class="prose prose-lg max-w-none text-slate-700 leading-relaxed space-y-6">
                        {get_safe_text(destination, "landscape_description")}
                    </div>
                </div>
            </section>'''


def render_dest_poi_section(destination):
    """Render the Points of Interest section (conditional)."""
    poi_html = render_poi_grid(destination.get('points_of_interest'))
    if not poi_html:
        return ''

    name = escape(destination.get('name', ''))
    return f'''<section class="w-full py-16 md:py-20 px-6">
                <div class="max-w-7xl mx-auto">
                    <div class="flex items-start gap-3 mb-10">
                        <div class="w-1.5 h-8 bg-primary rounded-full flex-shrink-0"></div>
                        <div>
                            <h2 class="text-2xl md:text-3xl font-black text-brand-purple">Points of Interest</h2>
                            <p class="text-slate-500 mt-1">Key highlights you&#39;ll discover in {name}</p>
                        </div>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {poi_html}
                    </div>
                </div>
            </section>'''


def render_dest_activities_section(destination):
    """Render the Top Activities section (conditional)."""
    activities = destination.get('top_activities')
    if not activities:
        return ''

    try:
        acts = json.loads(activities) if isinstance(activities, str) else activities
    except (json.JSONDecodeError, TypeError):
        return ''

    if not isinstance(acts, list) or len(acts) == 0:
        return ''

    # Activity icons mapping
    icon_map = {
        'walking': 'hiking', 'hiking': 'hiking', 'trekking': 'hiking',
        'cycling': 'directions_bike', 'biking': 'directions_bike',
        'kayaking': 'kayaking', 'swimming': 'pool', 'surfing': 'surfing',
        'fishing': 'phishing', 'photography': 'photo_camera',
        'birdwatching': 'visibility', 'wildlife': 'pets',
        'history': 'museum', 'heritage': 'museum', 'castle': 'castle',
        'food': 'restaurant', 'dining': 'restaurant', 'pub': 'local_bar',
        'music': 'music_note', 'festival': 'celebration',
        'beach': 'beach_access', 'garden': 'park', 'golf': 'golf_course',
    }

    cards = ''
    for i, act in enumerate(acts):
        title = escape(act.get('name', act.get('title', '')))
        desc = escape(act.get('description', ''))
        # Try to match an icon
        icon = 'landscape'
        title_lower = title.lower()
        for keyword, icon_name in icon_map.items():
            if keyword in title_lower:
                icon = icon_name
                break

        cards += f'''<div class="activity-card bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                            <div class="flex items-start gap-4">
                                <div class="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style="background:linear-gradient(135deg, #F17E00, #ff9a2e);">
                                    <span class="material-symbols-outlined text-white">{icon}</span>
                                </div>
                                <div>
                                    <h3 class="font-bold text-lg text-slate-900 mb-1">{title}</h3>
                                    <p class="text-slate-600 text-sm leading-relaxed">{desc}</p>
                                </div>
                            </div>
                        </div>\n'''

    name = escape(destination.get('name', ''))
    return f'''<section class="w-full py-16 md:py-20 px-6 bg-slate-50">
                <div class="max-w-7xl mx-auto">
                    <div class="flex items-start gap-3 mb-10">
                        <div class="w-1.5 h-8 bg-primary rounded-full flex-shrink-0"></div>
                        <div>
                            <h2 class="text-2xl md:text-3xl font-black text-brand-purple">Things to Do in {name}</h2>
                            <p class="text-slate-500 mt-1">Top activities and experiences in the area</p>
                        </div>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {cards}
                    </div>
                </div>
            </section>'''


def render_dest_cultural_section(destination):
    """Render the Cultural Highlights section (conditional)."""
    text = destination.get('cultural_highlights', '')
    if not text or not text.strip():
        return ''
    name = escape(destination.get('name', ''))
    return f'''<section class="w-full py-16 md:py-24 px-6">
                <div class="max-w-7xl mx-auto">
                    <div class="flex items-start gap-4 mb-8">
                        <div class="w-1.5 h-10 bg-primary rounded-full flex-shrink-0"></div>
                        <div>
                            <h2 class="text-3xl md:text-4xl font-black text-brand-purple">Culture &amp; Heritage</h2>
                            <p class="text-slate-500 mt-1">The stories and traditions of {name}</p>
                        </div>
                    </div>
                    <div class="prose prose-lg max-w-none text-slate-700 leading-relaxed space-y-6">
                        {get_safe_text(destination, "cultural_highlights")}
                    </div>
                </div>
            </section>'''


def render_dest_best_time_section(destination):
    """Render the Best Time to Visit section (conditional)."""
    best_months = destination.get('best_months')
    best_text = destination.get('best_time_to_visit', '')
    if (not best_months or not isinstance(best_months, list)) and not best_text:
        return ''

    months_html = render_best_months(best_months)
    text_html = get_safe_text(destination, 'best_time_to_visit') if best_text else ''

    return f'''<section class="w-full py-16 md:py-20 px-6">
                <div class="max-w-7xl mx-auto">
                    <div class="flex items-start gap-3 mb-8">
                        <div class="w-1.5 h-8 bg-primary rounded-full flex-shrink-0"></div>
                        <h2 class="text-2xl md:text-3xl font-black text-brand-purple">Best Time to Visit</h2>
                    </div>
                    {months_html}
                    <div class="prose max-w-none text-slate-700 leading-relaxed space-y-4 mt-8">
                        {text_html}
                    </div>
                </div>
            </section>'''


def render_dest_accommodation_section(destination):
    """Render the Accommodation section (conditional)."""
    text = destination.get('accommodation_style', '')
    if not text or not text.strip():
        return ''
    return f'''<section class="w-full py-16 md:py-24 px-6">
                <div class="max-w-7xl mx-auto">
                    <div class="flex items-start gap-4 mb-8">
                        <div class="w-1.5 h-10 bg-primary rounded-full flex-shrink-0"></div>
                        <div>
                            <h2 class="text-3xl md:text-4xl font-black text-brand-purple">Where You&#39;ll Stay</h2>
                            <p class="text-slate-500 mt-1">Handpicked accommodation along the route</p>
                        </div>
                    </div>
                    <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 md:p-10">
                        <div class="flex items-start gap-4 mb-6">
                            <span class="material-symbols-outlined text-primary text-3xl">hotel</span>
                            <div class="prose prose-lg max-w-none text-slate-700 leading-relaxed space-y-4">
                                {get_safe_text(destination, "accommodation_style")}
                            </div>
                        </div>
                    </div>
                </div>
            </section>'''


def render_dest_practical_section(destination):
    """Render the Practical Info / Getting Here section (conditional)."""
    text = destination.get('practical_info', '')
    if not text or not text.strip():
        return ''
    return f'''<section class="w-full py-16 md:py-24 px-6 bg-slate-50">
                <div class="max-w-7xl mx-auto">
                    <div class="flex items-start gap-4 mb-8">
                        <div class="w-1.5 h-10 bg-primary rounded-full flex-shrink-0"></div>
                        <div>
                            <h2 class="text-3xl md:text-4xl font-black text-brand-purple">Getting Here &amp; Practical Info</h2>
                            <p class="text-slate-500 mt-1">Everything you need to know before you go</p>
                        </div>
                    </div>
                    <div class="prose prose-lg max-w-none text-slate-700 leading-relaxed space-y-6">
                        {get_safe_text(destination, "practical_info")}
                    </div>
                </div>
            </section>'''


def render_dest_travel_tips_section(destination):
    """Render the Travel Tips section (conditional)."""
    tips = destination.get('travel_tips')
    if not tips:
        return ''
    try:
        tips_list = json.loads(tips) if isinstance(tips, str) else tips
    except (json.JSONDecodeError, TypeError):
        return ''
    if not isinstance(tips_list, list) or len(tips_list) == 0:
        return ''

    cards = ''
    tip_icons = ['lightbulb', 'backpack', 'checkroom', 'map', 'payments', 'local_taxi', 'restaurant', 'wb_sunny', 'health_and_safety', 'sim_card']
    for i, tip in enumerate(tips_list):
        title = escape(tip.get('title', tip.get('name', f'Tip {i+1}')))
        desc = escape(tip.get('description', tip.get('content', '')))
        icon = tip_icons[i % len(tip_icons)]
        cards += f'''<div class="flex items-start gap-4 bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                            <span class="material-symbols-outlined text-primary text-2xl flex-shrink-0">{icon}</span>
                            <div>
                                <h3 class="font-bold text-slate-900 mb-1">{title}</h3>
                                <p class="text-slate-600 text-sm leading-relaxed">{desc}</p>
                            </div>
                        </div>\n'''

    return f'''<section class="w-full py-16 md:py-24 px-6">
                <div class="max-w-7xl mx-auto">
                    <div class="flex items-start gap-4 mb-12">
                        <div class="w-1.5 h-10 bg-primary rounded-full flex-shrink-0"></div>
                        <div>
                            <h2 class="text-3xl md:text-4xl font-black text-brand-purple">Travel Tips</h2>
                            <p class="text-slate-500 mt-1">Insider advice for your trip</p>
                        </div>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {cards}
                    </div>
                </div>
            </section>'''


def render_dest_cuisine_section(destination):
    """Render the Local Cuisine section (conditional)."""
    cuisine = destination.get('local_cuisine')
    if not cuisine:
        return ''
    try:
        items = json.loads(cuisine) if isinstance(cuisine, str) else cuisine
    except (json.JSONDecodeError, TypeError):
        return ''
    if not isinstance(items, list) or len(items) == 0:
        return ''

    cards = ''
    for item in items:
        title = escape(item.get('name', item.get('title', '')))
        desc = escape(item.get('description', ''))
        cards += f'''<div class="cuisine-card bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                            <div class="flex items-start gap-3 mb-2">
                                <span class="material-symbols-outlined text-primary text-2xl">restaurant</span>
                                <h3 class="font-bold text-lg text-slate-900">{title}</h3>
                            </div>
                            <p class="text-slate-600 text-sm leading-relaxed">{desc}</p>
                        </div>\n'''

    name = escape(destination.get('name', ''))
    return f'''<section class="w-full py-16 md:py-24 px-6 bg-slate-50">
                <div class="max-w-7xl mx-auto">
                    <div class="flex items-start gap-4 mb-12">
                        <div class="w-1.5 h-10 bg-primary rounded-full flex-shrink-0"></div>
                        <div>
                            <h2 class="text-3xl md:text-4xl font-black text-brand-purple">Local Food &amp; Drink</h2>
                            <p class="text-slate-500 mt-1">Taste the flavours of {name}</p>
                        </div>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {cards}
                    </div>
                </div>
            </section>'''


def render_dest_reviews_section(reviews, destination, tours_by_id):
    """Render the reviews section wrapped in its own section element."""
    reviews_html = render_destination_review_section(reviews, destination, tours_by_id, prefix='')
    if not reviews_html or reviews_html.strip() == '':
        return ''
    return f'''<section class="w-full py-16 md:py-20 px-6 bg-slate-50">
                <div class="max-w-7xl mx-auto">
                    {reviews_html}
                </div>
            </section>'''


def render_dest_tour_cards_v3(tours, prefix='tours/', reviews_by_tour=None):
    """Render v3 tour cards for destination pages — matches JS card design in whi-tours.js exactly."""
    if not tours:
        return ""
    if reviews_by_tour is None:
        reviews_by_tour = {}

    # Region mappings — must match JS regionLabelMap and regionPageMap
    region_label_map = {
        'Dingle Peninsula': 'Wild Atlantic Way',
        'County Kerry': 'Wild Atlantic Way',
        'Wicklow Mountains': "Ireland's Ancient East",
        'South East Ireland': "Ireland's Ancient East",
        'The Burren': 'Wild Atlantic Way',
        'Causeway Coast': 'Causeway Coastal Route',
        'Cooley Peninsula': "Ireland's Ancient East",
        'Connemara': 'Wild Atlantic Way',
        'Beara Peninsula': 'Wild Atlantic Way',
        'Glens of Antrim': 'Causeway Coastal Route',
        'Mourne Mountains': 'Mourne Heritage Trail',
        'The Sperrins': 'Sperrins Heritage Trail',
    }
    region_page_map = {
        'Dingle Peninsula': 'walking-area-dingle-way.html',
        'County Kerry': 'walking-area-kerry-way.html',
        'Wicklow Mountains': 'walking-area-wicklow-way.html',
        'South East Ireland': 'walking-area-barrow-way.html',
        'The Burren': 'walking-area-burren-way.html',
        'Causeway Coast': 'walking-area-causeway-coast.html',
        'Cooley Peninsula': 'walking-area-cooley-mournes.html',
        'Connemara': 'walking-area-connemara.html',
        'Beara Peninsula': 'walking-area-beara-way.html',
        'Glens of Antrim': 'walking-area-antrim-glens.html',
        'Mourne Mountains': 'walking-area-mourne-mountains.html',
        'The Sperrins': 'walking-area-the-sperrins.html',
    }

    def get_boot_count(diff):
        return {'Easy': 1, 'Moderate': 2, 'Intermediate': 2, 'Challenging': 3}.get(diff, 1)

    def make_boots(diff):
        filled = get_boot_count(diff)
        boots = ''
        for i in range(3):
            src = 'images/icons/boot-filled.svg' if i < filled else 'images/icons/boot-outline.svg'
            boots += f'<img src="{src}" alt="" width="34" height="34" style="display:inline-block;margin-right:-2px;">'
        return boots

    def render_stars_html(avg):
        """Render review stars SVGs — matches JS renderStars()."""
        full = int(avg)
        half = (avg - full) >= 0.3
        html = ''
        for _ in range(full):
            html += '<svg width="16" height="16" viewBox="0 0 20 20" fill="#f59e0b"><path d="M10 1l2.39 4.84 5.34.78-3.87 3.77.91 5.32L10 13.27l-4.77 2.51.91-5.32L2.27 6.69l5.34-.78L10 1z"/></svg>'
        if half:
            html += '<svg width="16" height="16" viewBox="0 0 20 20"><defs><linearGradient id="halfStar"><stop offset="50%" stop-color="#f59e0b"/><stop offset="50%" stop-color="#d1d5db"/></linearGradient></defs><path d="M10 1l2.39 4.84 5.34.78-3.87 3.77.91 5.32L10 13.27l-4.77 2.51.91-5.32L2.27 6.69l5.34-.78L10 1z" fill="url(#halfStar)"/></svg>'
        remaining = 5 - full - (1 if half else 0)
        for _ in range(remaining):
            html += '<svg width="16" height="16" viewBox="0 0 20 20" fill="#d1d5db"><path d="M10 1l2.39 4.84 5.34.78-3.87 3.77.91 5.32L10 13.27l-4.77 2.51.91-5.32L2.27 6.69l5.34-.78L10 1z"/></svg>'
        return html

    html = ""
    for tour in tours:
        slug = tour.get('slug', '')
        name = escape(tour.get('name', ''))
        difficulty = tour.get('difficulty_level', '')
        days = tour.get('duration_days', 0) or 0
        price = tour.get('price_per_person_eur', 0)
        short_desc = escape(tour.get('subtitle') or tour.get('short_description', '') or '')
        region_name = tour.get('region_name', '')

        try:
            price_val = float(price) if price else 0
            price_display = f"{price_val:.0f}" if price_val == int(price_val) else f"{price_val:.2f}"
        except (ValueError, TypeError):
            price_display = str(price)

        # Compute per-day stats
        total_km, total_ascent = compute_tour_distances(tour)
        db_km = tour.get('total_distance_km')
        db_ascent = tour.get('elevation_gain_m')
        actual_km = float(db_km) if db_km else (total_km if total_km else 0)
        actual_ascent = int(db_ascent) if db_ascent else (total_ascent if total_ascent else 0)
        walk_days = days - 1 if days > 1 else 1
        km_per_day = round(actual_km / walk_days) if actual_km else None
        ascent_per_day = round(actual_ascent / walk_days) if actual_ascent else None
        # Descent per day (matches JS)
        db_descent = tour.get('total_descent_m')
        actual_descent = int(db_descent) if db_descent else 0
        descent_per_day = round(actual_descent / walk_days) if actual_descent else None

        # Region label + clickable link (matches JS regionPageMap)
        region_label = region_label_map.get(region_name, region_name)
        region_page = region_page_map.get(region_name, '')
        region_link = ''
        if region_label:
            if region_page:
                region_link = f'<span class="inline-flex items-center gap-1 text-xs font-semibold hover:underline" style="color:#3F0F87;" onclick="event.stopPropagation();event.preventDefault();window.location.href=\'{region_page}\';"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>{escape(region_label)}</span>'
            else:
                region_link = f'<span class="inline-flex items-center gap-1 text-xs font-semibold" style="color:#3F0F87;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>{escape(region_label)}</span>'

        # Boot icons
        boots = f'<div class="flex items-center" title="Diff.: {escape(difficulty)}" style="gap:0;">{make_boots(difficulty)}</div>'

        # Review stars + count (matches JS conditional rendering)
        review_html = ''
        tour_reviews = reviews_by_tour.get(tour.get('id'), [])
        if tour_reviews:
            ratings = [r.get('rating', 0) for r in tour_reviews if r.get('rating')]
            if ratings:
                avg_rating = round(sum(ratings) / len(ratings), 1)
                review_count = len(ratings)
                review_html = f'<div class="flex items-center gap-2"><div class="flex items-center gap-0.5">{render_stars_html(avg_rating)}</div><span class="text-sm font-bold text-slate-700">{avg_rating}</span><span class="text-xs text-slate-400">({review_count})</span></div>'

        # Stats bar (matches JS: days, km/day, ascent/day, descent/day)
        stats = []
        stats.append(f'<div class="flex flex-col items-center" style="min-width:60px;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="1.5"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg><span class="text-xs font-bold text-slate-700 mt-1">{days} Days</span></div>')
        if km_per_day:
            stats.append(f'<div class="flex flex-col items-center" style="min-width:60px;"><img src="images/icons/distance.svg" alt="" width="20" height="20" style="display:inline-block;"><span class="text-xs font-bold text-slate-700 mt-1">{km_per_day} km</span><span class="text-[9px] text-slate-400">/Day</span></div>')
        if ascent_per_day:
            stats.append(f'<div class="flex flex-col items-center" style="min-width:60px;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="1.5"><path d="M7 17l5-10 5 10"/><path d="M4 20h16"/></svg><span class="text-xs font-bold text-slate-700 mt-1">&uarr;{ascent_per_day}m</span><span class="text-[9px] text-slate-400">/Day</span></div>')
        if descent_per_day:
            stats.append(f'<div class="flex flex-col items-center" style="min-width:60px;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="1.5"><path d="M7 7l5 10 5-10"/><path d="M4 4h16"/></svg><span class="text-xs font-bold text-slate-700 mt-1">&darr;{descent_per_day}m</span><span class="text-[9px] text-slate-400">/Day</span></div>')

        stats_bar = '<div class="flex items-start justify-evenly py-3 px-2 border-t border-slate-100 gap-2">' + ''.join(stats) + '</div>'

        html += f'''<a href="{prefix}{slug}.html" class="group bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-xl transition-all flex flex-col h-full tour-card" data-region="{escape(region_name)}" data-difficulty="{escape(difficulty)}" data-days="{days}">
                <div class="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-primary/20 to-brand-purple/20">
                    <img src="images/routes/{slug}/card.jpg" srcset="images/routes/{slug}/card-400w.jpg 400w, images/routes/{slug}/card-800w.jpg 800w, images/routes/{slug}/card.jpg 1200w" sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" alt="{name}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" width="1200" height="800" onerror="this.style.display=\'none\'"/>
                    <div class="absolute inset-x-0 bottom-0 pointer-events-none" style="height:40%;background:linear-gradient(to top,rgba(33,7,71,0.55) 0%,rgba(33,7,71,0) 100%);"></div>
                    <h3 class="absolute bottom-3 left-3 right-3 text-white text-lg font-bold leading-snug drop-shadow-lg z-10" style="text-shadow:0 1px 4px rgba(0,0,0,0.5);">{name}</h3>
                    <div class="absolute top-3 right-3 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg px-4 py-2.5 text-center z-20">
                        <span class="block text-xs text-slate-500 font-medium leading-none mb-1">From</span>
                        <span class="block text-2xl font-extrabold leading-tight" style="color:#210747;">&euro;{price_display}</span>
                        <a href="price-promise.html" class="text-[10px] text-slate-400 hover:text-primary underline" title="Best price guarantee — see our price promise" onclick="event.stopPropagation();">*Price Promise</a>
                    </div>
                </div>
                <div class="flex flex-col justify-between flex-grow p-4 pb-2">
                    <div>
                        <p class="text-slate-500 text-sm leading-relaxed line-clamp-3 mb-2">{short_desc}</p>
                        {region_link}
                    </div>
                    <div class="flex items-center justify-between mt-3 mb-1">
                        {review_html}
                        {boots}
                    </div>
                </div>
                {stats_bar}
            </a>\n'''

    return html


def render_dest_landscape_culture_section(destination):
    """Render Landscape + Cultural Highlights as a 2-column section, or single-col if only one exists."""
    landscape = destination.get('landscape_description', '').strip()
    cultural = destination.get('cultural_highlights', '').strip()
    name = escape(destination.get('name', ''))

    if not landscape and not cultural:
        return ''

    # Both exist → 2-column layout
    if landscape and cultural:
        return f'''<section class="w-full py-16 md:py-20 px-6 bg-slate-50">
                <div class="max-w-7xl mx-auto">
                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-12">
                        <div>
                            <div class="flex items-start gap-3 mb-6">
                                <div class="w-1.5 h-8 bg-primary rounded-full flex-shrink-0"></div>
                                <h2 class="text-2xl md:text-3xl font-black text-brand-purple">The Landscape</h2>
                            </div>
                            <div class="prose max-w-none text-slate-700 leading-relaxed space-y-4">
                                {get_safe_text(destination, "landscape_description")}
                            </div>
                        </div>
                        <div>
                            <div class="flex items-start gap-3 mb-6">
                                <div class="w-1.5 h-8 bg-primary rounded-full flex-shrink-0"></div>
                                <h2 class="text-2xl md:text-3xl font-black text-brand-purple">Culture &amp; Heritage</h2>
                            </div>
                            <div class="prose max-w-none text-slate-700 leading-relaxed space-y-4">
                                {get_safe_text(destination, "cultural_highlights")}
                            </div>
                        </div>
                    </div>
                </div>
            </section>'''

    # Only one exists → single column
    title = 'The Landscape' if landscape else 'Culture &amp; Heritage'
    field = 'landscape_description' if landscape else 'cultural_highlights'
    return f'''<section class="w-full py-16 md:py-20 px-6 bg-slate-50">
                <div class="max-w-7xl mx-auto max-w-4xl">
                    <div class="flex items-start gap-3 mb-6">
                        <div class="w-1.5 h-8 bg-primary rounded-full flex-shrink-0"></div>
                        <h2 class="text-2xl md:text-3xl font-black text-brand-purple">{title}</h2>
                    </div>
                    <div class="prose prose-lg max-w-none text-slate-700 leading-relaxed space-y-4">
                        {get_safe_text(destination, field)}
                    </div>
                </div>
            </section>'''


def render_dest_accommodation_practical_section(destination):
    """Render Accommodation + Practical Info as a 2-column section."""
    accommodation = destination.get('accommodation_style', '').strip()
    practical = destination.get('practical_info', '').strip()

    if not accommodation and not practical:
        return ''

    # Both exist → 2-column layout
    if accommodation and practical:
        return f'''<section class="w-full py-16 md:py-20 px-6">
                <div class="max-w-7xl mx-auto">
                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-12">
                        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
                            <div class="flex items-center gap-3 mb-5">
                                <span class="material-symbols-outlined text-primary text-2xl">hotel</span>
                                <h2 class="text-2xl font-black text-brand-purple">Where You&#39;ll Stay</h2>
                            </div>
                            <div class="prose max-w-none text-slate-700 leading-relaxed space-y-4">
                                {get_safe_text(destination, "accommodation_style")}
                            </div>
                        </div>
                        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
                            <div class="flex items-center gap-3 mb-5">
                                <span class="material-symbols-outlined text-primary text-2xl">directions_car</span>
                                <h2 class="text-2xl font-black text-brand-purple">Getting Here</h2>
                            </div>
                            <div class="prose max-w-none text-slate-700 leading-relaxed space-y-4">
                                {get_safe_text(destination, "practical_info")}
                            </div>
                        </div>
                    </div>
                </div>
            </section>'''

    # Only one exists → single card
    if accommodation:
        title, icon, field = "Where You&#39;ll Stay", "hotel", "accommodation_style"
    else:
        title, icon, field = "Getting Here", "directions_car", "practical_info"

    return f'''<section class="w-full py-16 md:py-20 px-6">
                <div class="max-w-4xl mx-auto">
                    <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
                        <div class="flex items-center gap-3 mb-5">
                            <span class="material-symbols-outlined text-primary text-2xl">{icon}</span>
                            <h2 class="text-2xl font-black text-brand-purple">{title}</h2>
                        </div>
                        <div class="prose max-w-none text-slate-700 leading-relaxed space-y-4">
                            {get_safe_text(destination, field)}
                        </div>
                    </div>
                </div>
            </section>'''


def render_destination_page(destination, tours, reviews, faqs, tours_by_id):
    """Render a destination page from template."""
    template_path = WEBSITE_DIR / '_templates' / 'destination.html'

    if not template_path.exists():
        log(f"Template not found: {template_path}", 'error')
        return None

    with open(template_path, 'r') as f:
        template = f.read()

    dest_name = escape(destination.get('name', ''))
    dest_slug = escape(destination.get('slug', ''))

    # Build reviews lookup per tour for card star ratings
    card_reviews_by_tour = {}
    for review in reviews:
        tour_id = review.get('tour_id')
        if tour_id:
            if tour_id not in card_reviews_by_tour:
                card_reviews_by_tour[tour_id] = []
            card_reviews_by_tour[tour_id].append(review)

    # Use v3 tour cards — matches JS whi-tours.js design exactly
    tour_cards_html = render_dest_tour_cards_v3(tours, prefix='tours/', reviews_by_tour=card_reviews_by_tour)

    # Reviews
    reviews_section_html = render_dest_reviews_section(reviews, destination, tours_by_id)
    review_schema_html = render_destination_page_schema(destination, tours, reviews)

    # FAQs
    dest_faq_html, dest_faq_list = render_destination_faq_section(destination.get('id'), faqs, destination.get('name', ''))
    dest_faq_schema = render_faq_schema(dest_faq_list, max_items=8)

    # Walking info panel
    walking_info_html = render_walking_info_panel(destination, tours)

    # Combined 2-column sections
    landscape_culture_section = render_dest_landscape_culture_section(destination)
    accommodation_practical_section = render_dest_accommodation_practical_section(destination)

    # Conditional sections (still standalone)
    poi_section = render_dest_poi_section(destination)
    activities_section = render_dest_activities_section(destination)
    best_time_section = render_dest_best_time_section(destination)
    travel_tips_section = render_dest_travel_tips_section(destination)
    cuisine_section = render_dest_cuisine_section(destination)

    # Region name
    region_name = ''
    for t in (tours or []):
        rn = t.get('region_name', '')
        if rn:
            region_name = rn
            break

    # Build placeholders
    replacements = {
        '{meta_title}': escape(destination.get('meta_title') or destination.get('name', '')),
        '{meta_description}': escape(destination.get('seo_description') or destination.get('short_description', '')),
        '{destination_name}': dest_name,
        '{short_description}': escape(destination.get('short_description', '')),
        '{hero_image}': escape(destination.get('hero_image') or f'images/destinations/{destination.get("slug", "")}/hero.jpg'),
        '{region_name}': escape(region_name) if region_name else dest_name,
        '{overview}': get_safe_text(destination, 'overview'),
        '{destination_slug}': dest_slug,
        '{destination_schema}': render_destination_page_schema(destination, tours, reviews),
        '{walking_info_panel_html}': walking_info_html,
        '{landscape_culture_section}': landscape_culture_section,
        '{poi_section}': poi_section,
        '{activities_section}': activities_section,
        '{best_time_section}': best_time_section,
        '{tour_cards_html}': tour_cards_html,
        '{accommodation_practical_section}': accommodation_practical_section,
        '{travel_tips_section}': travel_tips_section,
        '{cuisine_section}': cuisine_section,
        '{reviews_section}': reviews_section_html,
        '{review_schema}': review_schema_html,
        '{faq_section_html}': dest_faq_html,
        '{faq_schema}': dest_faq_schema,
    }

    # Apply replacements
    html = template
    for key, value in replacements.items():
        html = html.replace(key, str(value))

    return html


def compute_tour_distances(tour):
    """Compute total distance and elevation from itinerary data."""
    itinerary = tour.get('itinerary')
    if not itinerary:
        return 0, 0

    try:
        days = json.loads(itinerary) if isinstance(itinerary, str) else itinerary
    except (json.JSONDecodeError, TypeError):
        return 0, 0

    if not isinstance(days, list):
        return 0, 0

    total_km = 0
    total_ascent = 0
    for day in days:
        dist = day.get('distance_km')
        if dist:
            try:
                total_km += float(dist)
            except (ValueError, TypeError):
                pass
        asc = day.get('ascent_m')
        if asc:
            try:
                total_ascent += int(float(asc))
            except (ValueError, TypeError):
                pass

    return round(total_km, 1), total_ascent


def render_tours_listing_json(tours, reviews_by_tour=None):
    """Build JSON data array for tours listing page client-side rendering."""
    if reviews_by_tour is None:
        reviews_by_tour = {}
    items = []
    for tour in tours:
        total_km, total_ascent = compute_tour_distances(tour)
        # Use DB field if populated, otherwise computed value
        db_km = tour.get('total_distance_km')
        db_ascent = tour.get('elevation_gain_m')

        price = tour.get('price_per_person_eur', 0)
        try:
            price_val = float(price) if price else 0
        except (ValueError, TypeError):
            price_val = 0

        # Review stats for this tour
        tour_reviews = reviews_by_tour.get(tour.get('id'), [])
        avg_rating = None
        review_count = 0
        if tour_reviews:
            ratings = [r.get('rating', 0) for r in tour_reviews if r.get('rating')]
            if ratings:
                avg_rating = round(sum(ratings) / len(ratings), 1)
                review_count = len(ratings)

        item = {
            'slug': tour.get('slug', ''),
            'name': tour.get('name', ''),
            'difficulty': tour.get('difficulty_level', ''),
            'days': tour.get('duration_days', 0) or 0,
            'price': price_val,
            'region': tour.get('region_name', ''),
            'short_desc': tour.get('subtitle') or tour.get('short_description', ''),
            'featured': bool(tour.get('featured')),
            'total_km': float(db_km) if db_km else (total_km if total_km else None),
            'total_ascent': int(db_ascent) if db_ascent else (total_ascent if total_ascent else None),
        }
        if avg_rating:
            item['avg_rating'] = avg_rating
            item['review_count'] = review_count
        items.append(item)

    return json.dumps(items, indent=2)


def render_tours_listing_schema(tours):
    """Render ItemList JSON-LD schema for tours listing page."""
    items = []
    for idx, tour in enumerate(tours, 1):
        price = tour.get('price_per_person_eur', 0)
        try:
            price_val = float(price) if price else 0
            price_display = f"{price_val:.0f}" if price_val == int(price_val) else f"{price_val:.2f}"
        except (ValueError, TypeError):
            price_display = str(price)

        total_km, total_ascent = compute_tour_distances(tour)

        item = {
            "@type": "ListItem",
            "position": idx,
            "name": tour.get('name', ''),
            "url": f"https://walkingholidayireland.com/tours/{tour.get('slug', '')}.html",
            "item": {
                "@type": ["TouristTrip", "Product"],
                "name": tour.get('name', ''),
                "description": tour.get('subtitle') or tour.get('short_description', ''),
                "duration": f"P{tour.get('duration_days', 0)}D",
                "touristType": "Walker",
                "offers": {
                    "@type": "Offer",
                    "price": price_display,
                    "priceCurrency": "EUR",
                    "availability": "https://schema.org/InStock"
                }
            }
        }
        if tour.get('region_name'):
            item["item"]["itinerary"] = {
                "@type": "ItemList",
                "description": f"Walking route through {tour.get('region_name')}"
            }
        items.append(item)

    schema = {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "name": "Self-Guided Walking Tours in Ireland",
        "description": f"{len(tours)} self-guided walking tours across Ireland's most stunning landscapes.",
        "numberOfItems": len(tours),
        "itemListElement": items
    }

    return f'    <script type="application/ld+json">\n{json.dumps(schema, indent=8)}\n    </script>\n'


def render_region_filter_options(tours):
    """Build region filter <option> tags from tour data."""
    regions = {}
    for tour in tours:
        region = tour.get('region_name', '')
        if region:
            regions[region] = regions.get(region, 0) + 1

    html = ''
    for region in sorted(regions.keys()):
        count = regions[region]
        html += f'                    <option value="{escape(region)}">{escape(region)} ({count})</option>\n'
    return html


def render_difficulty_filter_options(tours):
    """Build difficulty filter <option> tags from tour data."""
    order = ['Easy', 'Moderate', 'Intermediate', 'Challenging']
    found = set()
    for tour in tours:
        d = tour.get('difficulty_level', '')
        if d:
            found.add(d)

    html = ''
    for level in order:
        if level in found:
            html += f'                    <option value="{level}">{level}</option>\n'
    return html


def render_destinations_by_region(destinations, tours, regions_by_id):
    """Render destination cards grouped by region for the listing page."""
    # Group destinations by region
    dests_by_region = {}
    for dest in destinations:
        rid = dest.get('region_id', 'unknown')
        if rid not in dests_by_region:
            dests_by_region[rid] = []
        dests_by_region[rid].append(dest)

    # Build tours count per destination
    tours_per_dest = {}
    min_price_per_dest = {}
    for tour in tours:
        did = tour.get('destination_id')
        if did:
            tours_per_dest[did] = tours_per_dest.get(did, 0) + 1
            price = tour.get('price_per_person_eur', 0)
            try:
                price_val = float(price) if price else 0
            except (ValueError, TypeError):
                price_val = 0
            if price_val > 0:
                if did not in min_price_per_dest or price_val < min_price_per_dest[did]:
                    min_price_per_dest[did] = price_val

    # Sort regions by sort_order
    sorted_regions = sorted(regions_by_id.values(), key=lambda r: r.get('sort_order', 999))

    html = ''
    for region in sorted_regions:
        rid = region.get('id')
        region_dests = dests_by_region.get(rid, [])
        if not region_dests:
            continue

        region_name = escape(region.get('name', ''))
        region_slug = escape(region.get('slug', ''))

        html += f"""    <section class="region-section mb-16" data-region="{region_slug}">
        <div class="flex items-center gap-3 mb-8">
            <div class="w-1.5 h-8 bg-primary rounded-full"></div>
            <h2 class="text-2xl md:text-3xl font-black text-brand-purple">{region_name}</h2>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
"""
        for dest in sorted(region_dests, key=lambda d: d.get('sort_order', 999)):
            dest_slug = dest.get('slug', '')
            dest_name = escape(dest.get('name', ''))
            short_desc = escape(dest.get('short_description', '')[:120])
            if len(dest.get('short_description', '')) > 120:
                short_desc += '...'
            dest_id = dest.get('id')
            tour_count = tours_per_dest.get(dest_id, 0)
            min_price = min_price_per_dest.get(dest_id)

            tour_text = f"{tour_count} tour{'s' if tour_count != 1 else ''}" if tour_count else 'Coming soon'
            price_text = f"From &euro;{min_price:.0f}" if min_price else ''

            html += f"""            <a href="destination-{dest_slug}.html" class="dest-card group bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-lg hover:shadow-2xl transition-all" data-region="{region_slug}">
                <div class="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-primary/20 to-brand-purple/20">
                    <img src="images/destinations/{dest_slug}/card.jpg" alt="{dest_name}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" onerror="this.style.display='none'"/>
                </div>
                <div class="p-6">
                    <h3 class="text-xl font-bold mb-2 group-hover:text-primary transition-colors">{dest_name}</h3>
                    <p class="text-slate-600 text-sm leading-relaxed mb-4 line-clamp-2">{short_desc}</p>
                    <div class="flex items-center justify-between pt-4 border-t border-slate-100">
                        <span class="text-sm font-medium text-slate-500">{tour_text}</span>
                        <span class="text-primary font-bold">{price_text} &rarr;</span>
                    </div>
                </div>
            </a>
"""

        html += """        </div>
    </section>

"""
    return html


def render_region_tabs(regions_by_id, destinations):
    """Render region filter tab buttons."""
    # Count destinations per region
    dests_per_region = {}
    for dest in destinations:
        rid = dest.get('region_id', '')
        dests_per_region[rid] = dests_per_region.get(rid, 0) + 1

    sorted_regions = sorted(regions_by_id.values(), key=lambda r: r.get('sort_order', 999))

    html = ''
    for region in sorted_regions:
        rid = region.get('id')
        count = dests_per_region.get(rid, 0)
        if count == 0:
            continue
        name = escape(region.get('name', ''))
        slug = escape(region.get('slug', ''))
        html += f'        <button class="region-tab px-5 py-2.5 rounded-full text-sm font-semibold bg-white text-slate-600 border border-slate-200 hover:border-primary hover:text-primary transition-all" data-region="{slug}">{name} ({count})</button>\n'

    return html


def render_destinations_listing_json(destinations, tours):
    """Build JSON data for destinations listing page (used by map)."""
    tours_per_dest = {}
    min_price_per_dest = {}
    for tour in tours:
        did = tour.get('destination_id')
        if did:
            tours_per_dest[did] = tours_per_dest.get(did, 0) + 1
            price = tour.get('price_per_person_eur', 0)
            try:
                price_val = float(price) if price else 0
            except (ValueError, TypeError):
                price_val = 0
            if price_val > 0:
                if did not in min_price_per_dest or price_val < min_price_per_dest[did]:
                    min_price_per_dest[did] = price_val

    items = []
    for dest in destinations:
        did = dest.get('id')
        items.append({
            'slug': dest.get('slug', ''),
            'name': dest.get('name', ''),
            'lat': dest.get('map_center_lat'),
            'lng': dest.get('map_center_lng'),
            'region_id': dest.get('region_id', ''),
            'tour_count': tours_per_dest.get(did, 0),
            'min_price': min_price_per_dest.get(did),
        })

    return json.dumps(items, indent=2)


def render_destinations_listing_schema(destinations, tours):
    """Render ItemList JSON-LD schema for destinations listing page."""
    items = []
    for idx, dest in enumerate(destinations, 1):
        item = {
            "@type": "ListItem",
            "position": idx,
            "name": dest.get('name', ''),
            "url": f"https://walkingholidayireland.com/destination-{dest.get('slug', '')}.html",
            "item": {
                "@type": "TouristDestination",
                "name": dest.get('name', ''),
                "description": dest.get('short_description', ''),
                "containedInPlace": {
                    "@type": "Country",
                    "name": "Ireland"
                }
            }
        }
        items.append(item)

    schema = {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "name": "Walking Holiday Destinations in Ireland",
        "description": f"{len(destinations)} walking holiday destinations across Ireland.",
        "numberOfItems": len(destinations),
        "itemListElement": items
    }

    return f'    <script type="application/ld+json">\n{json.dumps(schema, indent=8)}\n    </script>\n'


def render_tour_page_schema(tour, reviews_list):
    """Render enhanced TouristTrip + Product schema for individual tour pages."""
    stats = compute_review_stats(reviews_list)
    total_km, total_ascent = compute_tour_distances(tour)
    price = tour.get('price_per_person_eur', 0)
    try:
        price_val = float(price) if price else 0
        price_display = f"{price_val:.0f}" if price_val == int(price_val) else f"{price_val:.2f}"
    except (ValueError, TypeError):
        price_display = str(price)

    schema = {
        "@context": "https://schema.org",
        "@type": ["TouristTrip", "Product"],
        "name": tour.get('name', ''),
        "description": strip_html_tags(tour.get('seo_description') or tour.get('short_description', '')),
        "url": f"https://walkingholidayireland.com/tours/{tour.get('slug', '')}.html",
        "touristType": "Walker",
        "duration": f"P{tour.get('duration_days', 0)}D",
        "provider": {
            "@type": "TourOperator",
            "name": "Walking Holiday Ireland",
            "url": "https://walkingholidayireland.com",
            "telephone": "+353429375983",
            "address": {
                "@type": "PostalAddress",
                "addressLocality": "Dundalk",
                "addressRegion": "Co. Louth",
                "addressCountry": "IE"
            }
        },
        "offers": {
            "@type": "Offer",
            "price": price_display,
            "priceCurrency": "EUR",
            "availability": "https://schema.org/InStock",
            "validFrom": "2026-01-01",
            "url": f"https://walkingholidayireland.com/tours/{tour.get('slug', '')}.html"
        },
        "brand": {
            "@type": "Brand",
            "name": "Walking Holiday Ireland"
        }
    }

    if total_km:
        schema["distance"] = {
            "@type": "QuantitativeValue",
            "value": total_km,
            "unitCode": "KMT",
            "unitText": "km"
        }

    if tour.get('difficulty_level'):
        schema["additionalProperty"] = [{
            "@type": "PropertyValue",
            "name": "Difficulty",
            "value": tour.get('difficulty_level')
        }]

    if stats['total'] > 0:
        schema["aggregateRating"] = {
            "@type": "AggregateRating",
            "ratingValue": str(stats['avg']),
            "bestRating": "5",
            "worstRating": "1",
            "reviewCount": str(stats['total'])
        }

    return f'    <script type="application/ld+json">\n{json.dumps(schema, indent=8)}\n    </script>\n'


def render_destination_page_schema(destination, tours_for_dest, reviews_list):
    """Render enhanced TouristDestination schema for individual destination pages."""
    stats = compute_review_stats(reviews_list)

    schema = {
        "@context": "https://schema.org",
        "@type": "TouristDestination",
        "name": destination.get('name', ''),
        "description": strip_html_tags(destination.get('seo_description') or destination.get('short_description', '')),
        "url": f"https://walkingholidayireland.com/destination-{destination.get('slug', '')}.html",
        "containedInPlace": {
            "@type": "Country",
            "name": destination.get('country', 'Ireland')
        }
    }

    # Add geo if available
    lat = destination.get('map_center_lat')
    lng = destination.get('map_center_lng')
    if lat and lng:
        schema["geo"] = {
            "@type": "GeoCoordinates",
            "latitude": lat,
            "longitude": lng
        }

    # Add tours as offers
    if tours_for_dest:
        prices = []
        for t in tours_for_dest:
            p = t.get('price_per_person_eur', 0)
            try:
                prices.append(float(p))
            except (ValueError, TypeError):
                pass
        if prices:
            schema["touristType"] = "Walker"

    if stats['total'] > 0:
        schema["aggregateRating"] = {
            "@type": "AggregateRating",
            "ratingValue": str(stats['avg']),
            "bestRating": "5",
            "worstRating": "1",
            "reviewCount": str(stats['total'])
        }

    return f'    <script type="application/ld+json">\n{json.dumps(schema, indent=8)}\n    </script>\n'


def main():
    """Main build process."""
    log("=" * 60)
    log("Walking Holiday Ireland — Build System")
    log("=" * 60)

    # Fetch data
    if LOCAL_MODE:
        data_dir = WEBSITE_DIR / '_data'
        log("Using local data files...", 'info')
        with open(data_dir / 'tours.json') as f:
            tours = json.load(f)
        with open(data_dir / 'destinations.json') as f:
            destinations = json.load(f)
        with open(data_dir / 'reviews.json') as f:
            reviews = json.load(f)
        with open(data_dir / 'faqs.json') as f:
            faqs = json.load(f)
        with open(data_dir / 'regions.json') as f:
            regions = json.load(f)
    else:
        log("Fetching tours from Supabase...")
        tours = fetch_supabase('tours', '&status=eq.published&order=sort_order')

        log("Fetching destinations from Supabase...")
        destinations = fetch_supabase('destinations', '&status=eq.published&order=sort_order')

        log("Fetching reviews from Supabase...")
        reviews = fetch_supabase('reviews', '&status=eq.published&order=featured.desc,rating.desc,review_date.desc')

        log("Fetching FAQs from Supabase...")
        faqs = fetch_supabase('faqs', '&status=eq.published&language=eq.en&order=section,sort_order')

        log("Fetching regions from Supabase...")
        regions = fetch_supabase('regions', '&order=sort_order')

    if not tours and not destinations:
        log("No data fetched. Check Supabase connection and RLS policies.", 'error')
        return

    log(f"Fetched {len(tours)} tours, {len(destinations)} destinations, {len(reviews)} reviews, {len(faqs)} FAQs, {len(regions)} regions")

    # Build lookups
    destinations_by_id = {d['id']: d for d in destinations}
    tours_by_id = {t['id']: t for t in tours}
    regions_by_id = {r['id']: r for r in regions}

    # Group reviews by tour_id
    reviews_by_tour = {}
    for review in reviews:
        tour_id = review.get('tour_id')
        if tour_id:
            if tour_id not in reviews_by_tour:
                reviews_by_tour[tour_id] = []
            reviews_by_tour[tour_id].append(review)

    # Group reviews by destination_id
    reviews_by_dest = {}
    for review in reviews:
        dest_id = review.get('destination_id')
        if dest_id:
            if dest_id not in reviews_by_dest:
                reviews_by_dest[dest_id] = []
            reviews_by_dest[dest_id].append(review)

    # Build tour pages
    log("\nGenerating tour pages...")
    for tour in tours:
        slug = tour.get('slug')
        if not slug:
            log("Tour has no slug, skipping", 'warn')
            continue

        tour_id = tour.get('id')
        tour_reviews = reviews_by_tour.get(tour_id, [])

        # Get destination for this tour
        dest_id = tour.get('destination_id')
        destination = destinations_by_id.get(dest_id, {})

        # Get related tours (same destination, different tour)
        related = [t for t in tours if t.get('destination_id') == dest_id and t.get('id') != tour_id]

        html = render_tour_page(tour, destination, related, tour_reviews, faqs, tours_by_id)

        if html:
            output_path = WEBSITE_DIR / 'tours' / f'{slug}.html'

            if DRY_RUN:
                log(f"Would generate: {output_path}", 'debug')
            else:
                output_path.parent.mkdir(parents=True, exist_ok=True)
                with open(output_path, 'w') as f:
                    f.write(html)
                log(f"Generated: {output_path}")

            generated['tours'].append(slug)
        else:
            generated['errors'].append(f"Tour {slug} failed to render")

    # Build destination pages
    log("\nGenerating destination pages...")
    for destination in destinations:
        slug = destination.get('slug')
        if not slug:
            log("Destination has no slug, skipping", 'warn')
            continue

        dest_id = destination.get('id')
        dest_tours = [t for t in tours if t.get('destination_id') == dest_id]
        dest_reviews = []
        for tour in dest_tours:
            dest_reviews.extend(reviews_by_tour.get(tour.get('id'), []))

        html = render_destination_page(destination, dest_tours, dest_reviews, faqs, tours_by_id)

        if html:
            # Write both destination-{slug}.html and walking-area-{slug}.html
            output_path = WEBSITE_DIR / f'destination-{slug}.html'
            walking_area_path = WEBSITE_DIR / f'walking-area-{slug}.html'

            if DRY_RUN:
                log(f"Would generate: {output_path}", 'debug')
            else:
                with open(output_path, 'w') as f:
                    f.write(html)
                with open(walking_area_path, 'w') as f:
                    f.write(html)
                log(f"Generated: {output_path} + walking-area-{slug}.html")

            generated['destinations'].append(slug)
        else:
            generated['errors'].append(f"Destination {slug} failed to render")

    # Save FAQ data cache
    if not LOCAL_MODE:
        data_dir = WEBSITE_DIR / '_data'
        data_dir.mkdir(exist_ok=True)
        with open(data_dir / 'faqs.json', 'w') as f:
            json.dump(faqs, f, indent=2)
        log(f"Cached {len(faqs)} FAQs to _data/faqs.json")

    # Build FAQ page
    log("\nGenerating FAQ page...")
    faq_template_path = WEBSITE_DIR / '_templates' / 'faq.html'
    if faq_template_path.exists():
        with open(faq_template_path, 'r') as f:
            faq_template = f.read()

        faq_sections_html = render_all_faq_sections(faqs)
        faq_tabs_html = render_faq_section_tabs(faqs)
        faq_schema_html = render_faq_schema(faqs, max_items=10)

        faq_html = faq_template
        faq_replacements = {
            '{faq_sections_html}': faq_sections_html,
            '{faq_tabs_html}': faq_tabs_html,
            '{faq_schema}': faq_schema_html,
            '{faq_count}': str(len(faqs)),
        }
        for key, value in faq_replacements.items():
            faq_html = faq_html.replace(key, str(value))

        output_path = WEBSITE_DIR / 'faq.html'
        if not DRY_RUN:
            with open(output_path, 'w') as f:
                f.write(faq_html)
            log(f"Generated: {output_path}")
    else:
        log("FAQ template not found, skipping", 'warn')

    # Build Reviews page
    log("\nGenerating Reviews page...")
    reviews_template_path = WEBSITE_DIR / '_templates' / 'reviews.html'
    if reviews_template_path.exists():
        with open(reviews_template_path, 'r') as f:
            reviews_template = f.read()

        all_stats = compute_review_stats(reviews)
        stats_bar_html = render_review_stats_bar(all_stats)

        # Build all review cards for the page (featured first)
        sorted_reviews = sorted(reviews, key=lambda r: (
            not r.get('featured', False),
            -(r.get('rating', 0)),
            r.get('review_date', '') or ''
        ))

        all_cards_html = ""
        for review in sorted_reviews:
            tour_id = review.get('tour_id')
            tour = tours_by_id.get(tour_id, {})
            all_cards_html += render_review_card(review, tour_name=tour.get('name', ''), show_tour=True)

        # Build filter options
        tour_options = '<option value="all">All Tours</option>\n'
        for t in sorted(tours, key=lambda x: x.get('name', '')):
            t_id = t.get('id', '')
            t_name = escape(t.get('name', ''))
            t_count = len(reviews_by_tour.get(t_id, []))
            if t_count > 0:
                tour_options += f'            <option value="{t_id}">{t_name} ({t_count})</option>\n'

        dest_options = '<option value="all">All Destinations</option>\n'
        seen_dests = set()
        for d in sorted(destinations, key=lambda x: x.get('name', '')):
            d_id = d.get('id', '')
            d_name = escape(d.get('name', ''))
            d_count = len(reviews_by_dest.get(d_id, []))
            if d_count > 0 and d_id not in seen_dests:
                dest_options += f'            <option value="{d_id}">{d_name} ({d_count})</option>\n'
                seen_dests.add(d_id)

        review_schema_all = render_review_schema(reviews, 'Walking Holiday Ireland', 'Self-guided walking holidays through Ireland', 'LocalBusiness')

        reviews_page_html = reviews_template
        reviews_replacements = {
            '{stats_bar_html}': stats_bar_html,
            '{review_cards_html}': all_cards_html,
            '{tour_filter_options}': tour_options,
            '{destination_filter_options}': dest_options,
            '{review_schema}': review_schema_all,
            '{review_count}': str(len(reviews)),
            '{avg_rating}': str(all_stats['avg']),
        }
        for key, value in reviews_replacements.items():
            reviews_page_html = reviews_page_html.replace(key, str(value))

        output_path = WEBSITE_DIR / 'reviews.html'
        if not DRY_RUN:
            with open(output_path, 'w') as f:
                f.write(reviews_page_html)
            log(f"Generated: {output_path}")
    else:
        log("Reviews template not found, skipping", 'warn')

    # Save data caches
    if not LOCAL_MODE:
        data_dir = WEBSITE_DIR / '_data'
        data_dir.mkdir(exist_ok=True)
        with open(data_dir / 'reviews.json', 'w') as f:
            json.dump(reviews, f, indent=2)
        log(f"Cached {len(reviews)} reviews to _data/reviews.json")
        with open(data_dir / 'regions.json', 'w') as f:
            json.dump(regions, f, indent=2)
        log(f"Cached {len(regions)} regions to _data/regions.json")

    # Build Tours Listing page
    log("\nGenerating Tours listing page...")
    tours_listing_template_path = WEBSITE_DIR / '_templates' / 'tours-listing.html'
    if tours_listing_template_path.exists():
        with open(tours_listing_template_path, 'r') as f:
            tours_listing_template = f.read()

        tours_json = render_tours_listing_json(tours, reviews_by_tour=reviews_by_tour)
        tours_schema = render_tours_listing_schema(tours)
        region_options = render_region_filter_options(tours)
        difficulty_options = render_difficulty_filter_options(tours)

        # Compute duration range
        durations = [t.get('duration_days', 0) for t in tours if t.get('duration_days')]
        duration_range = f"{min(durations)} to {max(durations)}" if durations else "5 to 10"

        tours_listing_replacements = {
            '{tours_json_data}': tours_json,
            '{tours_schema}': tours_schema,
            '{region_filter_options}': region_options,
            '{difficulty_filter_options}': difficulty_options,
            '{tour_count}': str(len(tours)),
            '{duration_range}': duration_range,
        }

        tours_listing_html = tours_listing_template
        for key, value in tours_listing_replacements.items():
            tours_listing_html = tours_listing_html.replace(key, str(value))

        output_path = WEBSITE_DIR / 'tours.html'
        if not DRY_RUN:
            with open(output_path, 'w') as f:
                f.write(tours_listing_html)
            log(f"Generated: {output_path}")
    else:
        log("Tours listing template not found, skipping", 'warn')

    # Build Destinations Listing page
    log("\nGenerating Destinations listing page...")
    dests_listing_template_path = WEBSITE_DIR / '_templates' / 'destinations-listing.html'
    if dests_listing_template_path.exists():
        with open(dests_listing_template_path, 'r') as f:
            dests_listing_template = f.read()

        # Only include destinations that have published tours
        published_dest_ids = set(t.get('destination_id') for t in tours if t.get('destination_id'))
        active_destinations = [d for d in destinations if d.get('id') in published_dest_ids]

        dests_json = render_destinations_listing_json(active_destinations, tours)
        dests_schema = render_destinations_listing_schema(active_destinations, tours)
        region_tabs = render_region_tabs(regions_by_id, active_destinations)
        dests_by_region_html = render_destinations_by_region(active_destinations, tours, regions_by_id)

        # Compute min price across all tours
        all_prices = []
        for t in tours:
            try:
                p = float(t.get('price_per_person_eur', 0))
                if p > 0:
                    all_prices.append(p)
            except (ValueError, TypeError):
                pass
        min_price = f"€{min(all_prices):.0f}" if all_prices else "€495"

        dests_listing_replacements = {
            '{destinations_json_data}': dests_json,
            '{destinations_schema}': dests_schema,
            '{region_tabs_html}': region_tabs,
            '{destinations_by_region_html}': dests_by_region_html,
            '{destination_count}': str(len(active_destinations)),
            '{min_price}': min_price,
        }

        dests_listing_html = dests_listing_template
        for key, value in dests_listing_replacements.items():
            dests_listing_html = dests_listing_html.replace(key, str(value))

        output_path = WEBSITE_DIR / 'destinations.html'
        if not DRY_RUN:
            with open(output_path, 'w') as f:
                f.write(dests_listing_html)
            log(f"Generated: {output_path}")
    else:
        log("Destinations listing template not found, skipping", 'warn')

    # Summary
    log("\n" + "=" * 60)
    log(f"Build complete: {len(generated['tours'])} tours, {len(generated['destinations'])} destinations")
    if generated['errors']:
        log(f"Errors: {len(generated['errors'])}", 'error')
        for error in generated['errors']:
            log(f"  - {error}", 'error')
    log("=" * 60)

    # Generate sitemap.xml
    if not DRY_RUN:
        today = datetime.now().strftime('%Y-%m-%d')
        sitemap_urls = []

        # Homepage — highest priority
        sitemap_urls.append(('https://walkingholidayireland.com/', '1.0', 'weekly'))

        # Listing pages — high priority
        sitemap_urls.append(('https://walkingholidayireland.com/tours.html', '0.9', 'weekly'))
        sitemap_urls.append(('https://walkingholidayireland.com/destinations.html', '0.9', 'weekly'))

        # Individual tour pages
        for slug in generated['tours']:
            sitemap_urls.append((f'https://walkingholidayireland.com/tours/{slug}.html', '0.8', 'monthly'))

        # Individual destination / walking area pages (canonical is walking-area-)
        for slug in generated['destinations']:
            sitemap_urls.append((f'https://walkingholidayireland.com/walking-area-{slug}.html', '0.8', 'monthly'))

        # Reviews and FAQ
        sitemap_urls.append(('https://walkingholidayireland.com/reviews.html', '0.7', 'monthly'))
        sitemap_urls.append(('https://walkingholidayireland.com/faq.html', '0.7', 'monthly'))

        # Static pages
        for page in ['about.html', 'contact.html', 'how-it-works.html', 'tailor-made.html', 'tour-grading.html', 'blog.html']:
            if (WEBSITE_DIR / page).exists():
                sitemap_urls.append((f'https://walkingholidayireland.com/{page}', '0.5', 'monthly'))

        # Blog articles
        blog_dir = WEBSITE_DIR / 'blog'
        if blog_dir.exists():
            for blog_file in sorted(blog_dir.glob('*.html')):
                if blog_file.name != 'index.html':
                    sitemap_urls.append((f'https://walkingholidayireland.com/blog/{blog_file.name}', '0.6', 'monthly'))

        sitemap_xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
        sitemap_xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        for url, priority, changefreq in sitemap_urls:
            sitemap_xml += f'  <url>\n'
            sitemap_xml += f'    <loc>{url}</loc>\n'
            sitemap_xml += f'    <lastmod>{today}</lastmod>\n'
            sitemap_xml += f'    <changefreq>{changefreq}</changefreq>\n'
            sitemap_xml += f'    <priority>{priority}</priority>\n'
            sitemap_xml += f'  </url>\n'
        sitemap_xml += '</urlset>\n'

        sitemap_path = WEBSITE_DIR / 'sitemap.xml'
        with open(sitemap_path, 'w') as f:
            f.write(sitemap_xml)
        log(f"Sitemap generated: {sitemap_path} ({len(sitemap_urls)} URLs)")

    # Write manifest
    manifest = {
        'generated_at': datetime.now().isoformat(),
        'tours': generated['tours'],
        'destinations': generated['destinations'],
        'errors': generated['errors'],
        'dry_run': DRY_RUN,
    }

    manifest_path = WEBSITE_DIR / '_build_manifest.json'
    if not DRY_RUN:
        with open(manifest_path, 'w') as f:
            json.dump(manifest, f, indent=2)
        log(f"Manifest written to: {manifest_path}")


if __name__ == '__main__':
    main()
