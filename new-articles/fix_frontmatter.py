#!/usr/bin/env python3
"""
Fix and standardize YAML frontmatter for all blog articles.
Ensures all 29 articles have complete frontmatter with:
- title
- description
- slug
- image (alt text)
"""

import os
import re
from pathlib import Path
from datetime import datetime

ARTICLES_DIR = "/sessions/sharp-upbeat-ptolemy/mnt/BLOG/new-articles"

def extract_frontmatter(content):
    """Extract frontmatter and body from markdown file."""
    # Match frontmatter block between --- delimiters
    match = re.match(r'^---\n(.*?)\n---\n', content, re.DOTALL)

    if match:
        frontmatter_text = match.group(1)
        body = content[match.end():]
        return parse_yaml_frontmatter(frontmatter_text), body

    return {}, content

def extract_full_body_for_analysis(filepath):
    """Read the full file to extract body for analysis."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    _, body = extract_frontmatter(content)
    return body

def parse_yaml_frontmatter(text):
    """Parse YAML frontmatter into a dictionary."""
    frontmatter = {}

    for line in text.split('\n'):
        if ':' in line and not line.strip().startswith('-'):
            key, value = line.split(':', 1)
            key = key.strip()
            value = value.strip().strip('"\'')
            frontmatter[key] = value

    return frontmatter

def extract_h1_title(body):
    """Extract H1 heading from markdown body."""
    match = re.match(r'^#\s+(.+?)(?:\n|$)', body)
    if match:
        return match.group(1).strip()
    return "Untitled Article"

def trim_to_length(text, max_length=160):
    """Trim text to maximum length, breaking at word boundaries."""
    if len(text) <= max_length:
        return text

    # Trim to max_length and find the last space
    trimmed = text[:max_length]
    last_space = trimmed.rfind(' ')

    if last_space > max_length - 50:  # If space is reasonably close
        trimmed = trimmed[:last_space]
    else:
        trimmed = trimmed.rstrip()

    # Add ellipsis if we trimmed content
    if len(trimmed) < len(text):
        trimmed = trimmed.rstrip('.') + '...'

    return trimmed

def generate_slug(filename):
    """Generate slug from filename."""
    # Remove .md extension and 'blog-' prefix, remove '-en' suffix
    slug = filename.replace('.md', '').replace('blog-', '').replace('-en', '')
    return f"/blog/{slug}"

def generate_description(title, body, filename):
    """
    Generate a compelling meta description based on article content.
    150-160 characters with call to action.
    """
    # Extract first meaningful paragraph
    paragraphs = body.split('\n\n')
    content_preview = ""

    for para in paragraphs:
        # Skip headers and very short content
        if para.strip() and not para.strip().startswith('#') and len(para) > 20:
            content_preview = para.strip()
            break

    # Clean up the preview
    content_preview = re.sub(r'\*\*(.+?)\*\*', r'\1', content_preview)  # Remove bold markers
    content_preview = re.sub(r'\*(.+?)\*', r'\1', content_preview)  # Remove italic markers
    content_preview = re.sub(r'\[(.+?)\]\(.+?\)', r'\1', content_preview)  # Remove links
    content_preview = content_preview.replace('\n', ' ').strip()

    # Create description based on filename/topic
    if 'hiking' in filename or 'walking' in filename or 'trail' in filename.lower():
        if 'way' in filename or 'guide' in filename:
            description = f"Complete {title.lower()} guide with detailed information. Expert tips, maps, and insider knowledge for the best experience. Plan your perfect Irish walking adventure today."
        elif 'accessible' in filename:
            description = f"Discover {title.lower()}. Wheelchair-friendly and mobility-accessible routes with detailed information on surfaces, gradients, and facilities. Experience Ireland at your own pace."
        elif 'couples' in filename or 'dog' in filename:
            description = f"Find the perfect {title.lower()} for your group. Detailed routes, distance information, and expert recommendations. Explore Ireland's beautiful landscapes together."
        elif 'mindfulness' in filename:
            description = f"Explore {title.lower()} for wellbeing. Transform your walking experience with mindfulness techniques and serene Irish landscapes. Discover inner peace while hiking."
        elif 'photography' in filename:
            description = f"Master {title.lower()} with expert tips and techniques. Capture stunning moments on Ireland's most scenic trails. Learn photography secrets from walking guides."
        elif 'festival' in filename:
            description = f"Discover {title.lower()} in 2026. Join vibrant walking communities across Ireland. Find events, dates, and registration information for unforgettable experiences."
        else:
            description = f"Explore {title.lower()}. Expert guides, detailed trail information, and insider tips for the best walking experiences in Ireland. Plan your adventure today."
    else:
        description = f"Learn about {title.lower()}. Comprehensive guide with practical advice and expert insights for Irish walking holidays. Start planning your perfect getaway now."

    # Trim to 150-160 characters
    description = trim_to_length(description, 160)

    return description

def generate_image_alt(title, body, filename):
    """Generate descriptive alt text based on article topic and content."""

    # Determine main topic from filename
    if 'way' in filename or 'guide' in filename:
        topic = filename.replace('blog-', '').replace('-en.md', '').replace('-', ' ')
        topic = topic.title().replace('Guide', '').replace('Way', '').strip()
        return f"{topic} hiking trail in Ireland with scenic landscape and walkers"
    elif 'accessible' in filename:
        return "Accessible walking trail in Ireland with paved surface and wheelchair-friendly infrastructure"
    elif 'couples' in filename:
        return "Couple walking together on a scenic Irish trail surrounded by green landscapes"
    elif 'dog' in filename:
        return "Dog-friendly walking trail in Ireland with walkers and their dogs enjoying nature"
    elif 'dublin' in filename:
        return "Dublin city day hike with scenic urban and natural landscapes"
    elif 'mindfulness' in filename:
        return "Serene Irish landscape perfect for mindfulness walking and meditation"
    elif 'photography' in filename:
        return "Photographer capturing stunning moments on Ireland's scenic hiking trails"
    elif 'stargazing' in filename:
        return "Night sky with stars visible over Irish landscape during stargazing walk"
    elif 'festival' in filename:
        return "Walking festival in Ireland with hikers gathering on scenic trail"
    elif 'rainy' in filename:
        return "Rainy day activities on Irish hiking trails with misty landscapes"
    else:
        return f"Scenic hiking trail in Ireland - {title.replace('Ireland', '').strip()}"

def format_frontmatter(frontmatter_dict):
    """Format frontmatter dictionary as YAML string."""
    lines = []

    # Order of fields
    field_order = ['title', 'description', 'slug', 'image']

    for field in field_order:
        if field in frontmatter_dict:
            value = frontmatter_dict[field]
            # Properly quote values
            if field == 'slug':
                lines.append(f'{field}: {value}')
            else:
                # Escape quotes in value and wrap in quotes
                value = value.replace('"', '\\"')
                lines.append(f'{field}: "{value}"')

    return '\n'.join(lines)

def process_article(filepath):
    """Process a single article file."""
    filename = os.path.basename(filepath)

    # Read file
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Extract existing frontmatter and body
    frontmatter, body = extract_frontmatter(content)

    # Track what we're adding
    updates = []

    # Ensure title exists - extract from body to get the real H1
    title = frontmatter.get('title', '').strip()
    if not title or title == "Untitled Article":
        extracted_title = extract_h1_title(body)
        if extracted_title and extracted_title != "Untitled Article":
            title = extracted_title
            if not frontmatter.get('title'):
                updates.append('title')
            else:
                updates.append('title (fixed)')
        frontmatter['title'] = title
    else:
        title = frontmatter['title']

    # Ensure slug exists - normalize the format
    if not frontmatter.get('slug'):
        slug = generate_slug(filename)
        frontmatter['slug'] = slug
        updates.append('slug')
    else:
        # Normalize slug if it exists
        slug = frontmatter['slug']
        if not slug.startswith('/'):
            slug = f"/blog/{slug.replace('blog-', '').replace('-en', '')}"
            frontmatter['slug'] = slug

    # Ensure description exists
    if not frontmatter.get('description'):
        description = generate_description(title, body, filename)
        frontmatter['description'] = description
        updates.append('description')
    else:
        # Verify description length and trim if needed
        description = frontmatter['description']
        if len(description) > 160:
            description = trim_to_length(description, 160)
            frontmatter['description'] = description
            updates.append('description (trimmed)')

    # Ensure image alt text exists
    if not frontmatter.get('image') and not frontmatter.get('image_alt'):
        image_alt = generate_image_alt(title, body, filename)
        frontmatter['image'] = image_alt
        updates.append('image')
    elif frontmatter.get('image_alt') and not frontmatter.get('image'):
        # Migrate from image_alt to image
        image_alt = frontmatter.pop('image_alt')
        frontmatter['image'] = image_alt
        updates.append('image (migrated from image_alt)')

    # Create new content with standardized frontmatter
    new_frontmatter = format_frontmatter(frontmatter)
    new_content = f"---\n{new_frontmatter}\n---\n{body}"

    # Write back to file
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)

    return {
        'file': filename,
        'updates': updates,
        'title': title,
        'slug': frontmatter['slug']
    }

def main():
    """Process all markdown files in the articles directory."""

    # Get all markdown files
    md_files = sorted([f for f in os.listdir(ARTICLES_DIR) if f.endswith('.md')])

    print(f"Processing {len(md_files)} articles...\n")
    print("=" * 100)

    results = []

    for md_file in md_files:
        filepath = os.path.join(ARTICLES_DIR, md_file)
        try:
            result = process_article(filepath)
            results.append(result)

            # Print status for each file
            status = "✓" if result['updates'] else "→"
            print(f"{status} {result['file']}")
            if result['updates']:
                print(f"  Added/Fixed: {', '.join(result['updates'])}")
                print(f"  Slug: {result['slug']}")
            else:
                print(f"  (No changes needed)")
            print()

        except Exception as e:
            print(f"✗ {md_file}")
            print(f"  Error: {str(e)}\n")
            results.append({'file': md_file, 'error': str(e)})

    # Print summary
    print("=" * 100)
    print(f"\nSUMMARY:")
    print(f"Total files processed: {len(md_files)}")
    successful = [r for r in results if 'error' not in r]
    print(f"Successfully updated: {len(successful)}")
    errors = [r for r in results if 'error' in r]
    if errors:
        print(f"Errors: {len(errors)}")
        for error in errors:
            print(f"  - {error['file']}: {error['error']}")

    # Show what was updated
    files_with_updates = [r for r in results if r.get('updates')]
    print(f"\nFiles with updates: {len(files_with_updates)}")
    for result in files_with_updates:
        print(f"  {result['file']}: {', '.join(result['updates'])}")

if __name__ == '__main__':
    main()
