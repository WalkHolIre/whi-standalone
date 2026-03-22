#!/usr/bin/env python3
"""
Walking Holiday Ireland — Blog Build System
=============================================
Converts markdown articles to static HTML blog pages using the blog-article template.
Also regenerates the blog listing page (blog.html) with real article cards.

Usage:
    python3 build_blog.py                  # Build all selected articles
    python3 build_blog.py --dry-run        # Preview what would be built
    python3 build_blog.py --verbose        # Show detailed output
"""

import json
import os
import re
import sys
import math
import datetime as dt
from datetime import datetime, timedelta
from pathlib import Path
from html import escape

# Configuration
WEBSITE_DIR = Path(__file__).parent
ARTICLES_DIR = WEBSITE_DIR.parent / 'new-articles'
TEMPLATE_PATH = WEBSITE_DIR / '_templates' / 'blog-article.html'
BLOG_DIR = WEBSITE_DIR / 'blog'
DRY_RUN = '--dry-run' in sys.argv
VERBOSE = '--verbose' in sys.argv or '-v' in sys.argv

# The 25 selected launch articles (filename without .md)
LAUNCH_ARTICLES = [
    # Tier 1: Active destination guides
    'blog-dingle-way-walking-guide-en',
    'blog-kerry-way-complete-guide-en',
    'blog-wicklow-way-complete-guide-en',
    'blog-burren-way-walking-guide-en',
    'blog-antrim-coast-walk-en',
    'blog-glens-of-antrim-walking-en',
    'blog-hiking-cooley-peninsula-en',
    # Tier 2: High-intent planning
    'blog-dingle-way-vs-kerry-way-en',
    'blog-plan-hiking-trip-ireland-en',
    'blog-best-time-visit-ireland-hiking-en',
    'blog-guided-vs-self-guided-walking-holidays-en',
    'blog-self-guided-walking-holidays-ireland-en',
    'blog-walking-holidays-over-50-en',
    'blog-booking-walking-holiday-ireland-en',
    'blog-hiking-tour-grading-ireland-en',
    # Tier 3: SEO value
    'blog-best-hiking-trails-ireland-2026-en',
    'blog-ireland-national-parks-walking-en',
    'blog-best-hikes-killarney-national-park-en',
    'blog-scenic-walks-ireland-2026-en',
    'best-walks-in-northern-ireland',
    # Tier 4: Beginner accessibility
    'beginner-friendly-hiking-trails-ireland',
    'blog-walking-holidays-ireland-2026-en',
    'blog-benefits-hiking-ireland-en',
    'checklist-for-solo-hiking',
    'best-trails-in-ireland-for-solo-hikers',
    # Tier 5: SEO brief high-traffic content (carry forward from old site)
    'the-famine-roads-of-ireland',
    'connemara-national-park',
    'our-top-five-connemara-hikes',
    'st-kevin-of-glendalough',
    'towns-and-villages-along-the-wicklow-way',
    'solo-inn-to-inn-hiking-ireland',
]

# Category assignments based on content type
CATEGORY_MAP = {
    'dingle': 'Trail Guide', 'kerry': 'Trail Guide', 'wicklow': 'Trail Guide',
    'burren': 'Trail Guide', 'antrim': 'Trail Guide', 'glens': 'Trail Guide',
    'cooley': 'Trail Guide', 'killarney': 'Trail Guide', 'northern-ireland': 'Trail Guide',
    'plan': 'Planning', 'best-time': 'Planning', 'booking': 'Planning', 'travel': 'Planning',
    'guided-vs': 'Planning', 'self-guided': 'Planning',
    'over-50': 'Walking Tips', 'grading': 'Walking Tips', 'beginner': 'Walking Tips',
    'solo': 'Walking Tips', 'checklist': 'Walking Tips', 'benefits': 'Walking Tips',
    'best-hiking': 'Destinations', 'scenic': 'Destinations', 'national-park': 'Destinations',
    'walks-in': 'Destinations', 'holidays-ireland-2026': 'Destinations',
    'famine': 'History & Culture', 'connemara': 'Trail Guide', 'st-kevin': 'History & Culture',
    'glendalough': 'History & Culture', 'towns-and-villages': 'Trail Guide',
    'inn-to-inn': 'Walking Tips',
}

# Staggered publish dates for SEO (2 per week, starting Feb 2026)
BASE_DATE = datetime(2026, 2, 2)

generated = {'articles': [], 'errors': []}


def log(msg, level='info'):
    levels = {'info': '✓', 'warn': '⚠', 'error': '✗', 'debug': '→'}
    prefix = levels.get(level, '•')
    if level != 'debug' or VERBOSE:
        print(f"{prefix} {msg}")


def parse_frontmatter(content):
    """Extract YAML-like frontmatter from markdown content."""
    if not content.startswith('---'):
        return {}, content

    end = content.find('---', 3)
    if end == -1:
        return {}, content

    frontmatter_text = content[3:end].strip()
    body = content[end + 3:].strip()

    meta = {}
    for line in frontmatter_text.split('\n'):
        line = line.strip()
        if ':' in line:
            key, _, value = line.partition(':')
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            meta[key] = value

    return meta, body


def detect_category(filename, meta):
    """Assign a category based on filename keywords."""
    for keyword, category in CATEGORY_MAP.items():
        if keyword in filename.lower():
            return category
    return 'Walking Tips'


def estimate_read_time(text):
    """Estimate read time in minutes based on word count."""
    words = len(text.split())
    return max(3, math.ceil(words / 225))


def markdown_to_html(text):
    """Convert markdown to HTML (handles common patterns)."""
    lines = text.split('\n')
    html_lines = []
    in_list = False
    list_type = None

    for line in lines:
        stripped = line.strip()

        # Skip the H1 title (already in template header)
        if stripped.startswith('# ') and not stripped.startswith('## '):
            continue

        # Headings
        if stripped.startswith('#### '):
            if in_list:
                html_lines.append(f'</{list_type}>')
                in_list = False
            html_lines.append(f'<h4>{process_inline(stripped[5:])}</h4>')
            continue
        if stripped.startswith('### '):
            if in_list:
                html_lines.append(f'</{list_type}>')
                in_list = False
            html_lines.append(f'<h3>{process_inline(stripped[4:])}</h3>')
            continue
        if stripped.startswith('## '):
            if in_list:
                html_lines.append(f'</{list_type}>')
                in_list = False
            html_lines.append(f'<h2>{process_inline(stripped[3:])}</h2>')
            continue

        # Horizontal rule
        if stripped in ('---', '***', '___'):
            if in_list:
                html_lines.append(f'</{list_type}>')
                in_list = False
            html_lines.append('<hr/>')
            continue

        # Blockquote
        if stripped.startswith('> '):
            if in_list:
                html_lines.append(f'</{list_type}>')
                in_list = False
            html_lines.append(f'<blockquote><p>{process_inline(stripped[2:])}</p></blockquote>')
            continue

        # Unordered list
        if re.match(r'^[-*+]\s', stripped):
            if not in_list or list_type != 'ul':
                if in_list:
                    html_lines.append(f'</{list_type}>')
                html_lines.append('<ul>')
                in_list = True
                list_type = 'ul'
            content = re.sub(r'^[-*+]\s+', '', stripped)
            html_lines.append(f'<li>{process_inline(content)}</li>')
            continue

        # Ordered list
        if re.match(r'^\d+\.\s', stripped):
            if not in_list or list_type != 'ol':
                if in_list:
                    html_lines.append(f'</{list_type}>')
                html_lines.append('<ol>')
                in_list = True
                list_type = 'ol'
            content = re.sub(r'^\d+\.\s+', '', stripped)
            html_lines.append(f'<li>{process_inline(content)}</li>')
            continue

        # Close list if we hit a non-list line
        if in_list and stripped:
            html_lines.append(f'</{list_type}>')
            in_list = False

        # Empty line
        if not stripped:
            continue

        # Regular paragraph
        html_lines.append(f'<p>{process_inline(stripped)}</p>')

    if in_list:
        html_lines.append(f'</{list_type}>')

    return '\n'.join(html_lines)


def process_inline(text):
    """Process inline markdown: bold, italic, links, images."""
    # Images: ![alt](url)
    text = re.sub(r'!\[([^\]]*)\]\(([^)]+)\)', r'<img src="\2" alt="\1"/>', text)
    # Links: [text](url)
    text = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', r'<a href="\2">\1</a>', text)
    # Bold+italic: ***text***
    text = re.sub(r'\*\*\*(.+?)\*\*\*', r'<strong><em>\1</em></strong>', text)
    # Bold: **text**
    text = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', text)
    # Italic: *text*
    text = re.sub(r'(?<!\*)\*([^*]+)\*(?!\*)', r'<em>\1</em>', text)
    # Inline code: `code`
    text = re.sub(r'`([^`]+)`', r'<code class="bg-slate-100 px-1.5 py-0.5 rounded text-sm">\1</code>', text)
    return text


def make_slug(meta, filename):
    """Generate URL slug from frontmatter or filename."""
    slug = meta.get('slug', '')
    if slug:
        # Clean up: remove /blog/ prefix, trailing slashes
        slug = slug.strip('/').replace('/blog/', '').replace('blog/', '')
    if not slug:
        slug = filename.replace('.md', '')
        # Remove common prefixes/suffixes
        slug = re.sub(r'^blog-', '', slug)
        slug = re.sub(r'-en$', '', slug)
    return slug


def render_article_card(article, prefix=''):
    """Render a single blog card for the listing page."""
    slug = article['slug']
    title = escape(article['title'])
    description = escape(article['description'][:150])
    category = escape(article['category'])
    read_time = article['read_time']
    date_display = article['date_display']

    return f"""        <a href="{prefix}blog/{slug}.html" class="group bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-lg hover:shadow-2xl transition-all flex flex-col h-full">
            <div class="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-primary/20 to-brand-purple/20">
                <div class="absolute top-4 left-4">
                    <span class="bg-slate-900 text-white px-3 py-1 rounded-lg text-xs font-bold uppercase">{category}</span>
                </div>
            </div>
            <div class="flex flex-col justify-between flex-grow p-6">
                <div>
                    <div class="flex items-center gap-2 mb-3">
                        <span class="text-xs font-bold text-slate-500 uppercase tracking-widest">{date_display}</span>
                        <span class="text-slate-300">&bull;</span>
                        <span class="text-xs font-bold text-slate-500 uppercase tracking-widest">{read_time} min read</span>
                    </div>
                    <h3 class="text-xl font-bold mb-3 leading-snug">{title}</h3>
                    <p class="text-slate-600 text-sm leading-relaxed line-clamp-2">{description}</p>
                </div>
                <div class="flex items-center gap-2 text-primary font-bold mt-4 group-hover:gap-3 transition-all">
                    Read More
                    <span class="material-symbols-outlined text-lg">arrow_forward</span>
                </div>
            </div>
        </a>
"""


def build_articles():
    """Build all selected article pages."""
    log("=" * 60)
    log("Walking Holiday Ireland — Blog Build")
    log("=" * 60)

    # Load template
    if not TEMPLATE_PATH.exists():
        log(f"Template not found: {TEMPLATE_PATH}", 'error')
        return []

    with open(TEMPLATE_PATH) as f:
        template = f.read()

    # Ensure blog directory exists
    if not DRY_RUN:
        BLOG_DIR.mkdir(parents=True, exist_ok=True)

    articles_data = []

    for idx, article_name in enumerate(LAUNCH_ARTICLES):
        filename = f"{article_name}.md"
        filepath = ARTICLES_DIR / filename

        if not filepath.exists():
            log(f"Article not found: {filename}", 'error')
            generated['errors'].append(f"Missing: {filename}")
            continue

        # Read and parse
        with open(filepath) as f:
            content = f.read()

        meta, body = parse_frontmatter(content)

        if not meta.get('title'):
            log(f"No title in frontmatter: {filename}", 'warn')
            # Try to extract from first H1
            h1_match = re.search(r'^# (.+)$', body, re.MULTILINE)
            if h1_match:
                meta['title'] = h1_match.group(1).strip()
            else:
                meta['title'] = article_name.replace('-', ' ').title()

        # Build article data
        slug = make_slug(meta, filename)
        title = meta.get('title', '')
        description = meta.get('description', '')[:300]
        category = detect_category(article_name, meta)
        read_time = estimate_read_time(body)

        # Staggered dates: 2 per week (Mon + Thu)
        days_offset = (idx // 2) * 7 + (idx % 2) * 3
        pub_date = BASE_DATE + timedelta(days=days_offset)
        date_published = pub_date.strftime('%Y-%m-%d')
        date_display = pub_date.strftime('%b %d, %Y')

        # Convert markdown body to HTML
        article_html = markdown_to_html(body)

        article_info = {
            'slug': slug,
            'title': title,
            'description': description,
            'category': category,
            'read_time': read_time,
            'date_published': date_published,
            'date_display': date_display,
            'filename': filename,
        }
        articles_data.append(article_info)

        # Apply template
        html = template
        replacements = {
            '{meta_title}': escape(title),
            '{meta_description}': escape(description),
            '{slug}': escape(slug),
            '{article_title}': escape(title),
            '{category}': escape(category),
            '{read_time}': str(read_time),
            '{date_published}': date_published,
            '{date_display}': date_display,
            '{article_body}': article_html,
        }

        for key, value in replacements.items():
            html = html.replace(key, str(value))

        # Related articles placeholder (filled after all are processed)
        html = html.replace('{related_articles_html}', '<!-- Related articles populated on rebuild -->')

        # Write file
        output_path = BLOG_DIR / f'{slug}.html'
        if DRY_RUN:
            log(f"Would generate: blog/{slug}.html ({read_time} min, {category})", 'debug')
        else:
            with open(output_path, 'w') as f:
                f.write(html)
            log(f"Generated: blog/{slug}.html — {title[:50]}...")

        generated['articles'].append(slug)

    # Now add related articles to each page
    if not DRY_RUN and len(articles_data) > 3:
        log("\nAdding related articles to each page...")
        for idx, article in enumerate(articles_data):
            output_path = BLOG_DIR / f'{article["slug"]}.html'
            if not output_path.exists():
                continue

            with open(output_path) as f:
                html = f.read()

            # Pick 3 related articles (different from current, prefer same category)
            same_cat = [a for a in articles_data if a['category'] == article['category'] and a['slug'] != article['slug']]
            diff_cat = [a for a in articles_data if a['category'] != article['category']]
            related = (same_cat[:2] + diff_cat[:1]) if len(same_cat) >= 2 else (same_cat + diff_cat)[:3]

            related_html = '\n'.join([render_article_card(r, prefix='../') for r in related[:3]])
            html = html.replace('<!-- Related articles populated on rebuild -->', related_html)

            with open(output_path, 'w') as f:
                f.write(html)

    return articles_data


def build_blog_listing(articles_data):
    """Regenerate blog.html with real article cards."""
    log("\nRebuilding blog listing page...")

    blog_html_path = WEBSITE_DIR / 'blog.html'
    if not blog_html_path.exists():
        log("blog.html not found", 'error')
        return

    with open(blog_html_path) as f:
        original = f.read()

    # Featured article = first article (Dingle Way guide)
    featured = articles_data[0] if articles_data else None
    remaining = articles_data[1:] if len(articles_data) > 1 else []

    # Build featured section
    if featured:
        featured_html = f"""<section class="group">
    <a href="blog/{escape(featured['slug'])}.html" class="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-lg hover:shadow-2xl transition-all">
        <div class="relative h-[300px] lg:h-full overflow-hidden bg-gradient-to-br from-primary/30 to-brand-purple/30">
            <div class="absolute top-4 left-4">
                <span class="bg-primary text-white px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wide">Featured</span>
            </div>
        </div>
        <div class="flex flex-col justify-center p-8 lg:p-12">
            <div class="flex items-center gap-3 mb-4">
                <span class="text-xs uppercase font-bold text-primary tracking-widest">{escape(featured['category'])}</span>
                <span class="text-slate-300">&bull;</span>
                <span class="text-xs uppercase font-bold text-slate-500 tracking-widest">{featured['read_time']} min read</span>
            </div>
            <h2 class="text-3xl lg:text-4xl font-black mb-4 leading-tight">{escape(featured['title'])}</h2>
            <p class="text-lg text-slate-600 leading-relaxed mb-6">{escape(featured['description'][:200])}</p>
            <div class="flex items-center gap-2 text-primary font-bold group-hover:gap-3 transition-all">
                Read the Full Guide
                <span class="material-symbols-outlined">arrow_forward</span>
            </div>
        </div>
    </a>
</section>"""
    else:
        featured_html = ''

    # Build grid cards
    grid_cards = '\n'.join([render_article_card(a) for a in remaining])

    grid_html = f"""<section>
    <div class="flex items-center gap-3 mb-12">
        <div class="w-1.5 h-8 bg-primary rounded-full"></div>
        <h2 class="text-3xl font-bold">Latest Articles</h2>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
{grid_cards}
    </div>
</section>"""

    # Replace the content between markers
    content_start = original.find('<!-- Featured Post')
    if content_start == -1:
        content_start = original.find('<!-- Content Area -->')
        if content_start != -1:
            content_start = original.find('\n', content_start) + 1

    content_end = original.find('<!-- Newsletter Signup')

    if content_start == -1 or content_end == -1:
        log("Could not find content markers in blog.html", 'error')
        return

    new_content = f"""
{featured_html}

{grid_html}

"""

    new_html = original[:content_start] + new_content + original[content_end:]

    if DRY_RUN:
        log(f"Would update blog.html with {len(articles_data)} articles")
    else:
        with open(blog_html_path, 'w') as f:
            f.write(new_html)
        log(f"Updated blog.html with {len(articles_data)} article cards")


def main():
    articles_data = build_articles()

    if articles_data:
        build_blog_listing(articles_data)

    # Write manifest
    manifest = {
        'generated_at': datetime.now().isoformat(),
        'articles': generated['articles'],
        'errors': generated['errors'],
        'total': len(generated['articles']),
    }

    manifest_path = WEBSITE_DIR / '_blog_manifest.json'
    if not DRY_RUN:
        with open(manifest_path, 'w') as f:
            json.dump(manifest, f, indent=2)

    log(f"\n{'=' * 60}")
    log(f"Blog build complete: {len(generated['articles'])} articles")
    if generated['errors']:
        log(f"Errors: {len(generated['errors'])}", 'error')
        for e in generated['errors']:
            log(f"  - {e}", 'error')
    log("=" * 60)


if __name__ == '__main__':
    main()
