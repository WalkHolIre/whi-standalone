#!/usr/bin/env python3
"""Verify all articles have complete frontmatter with required fields."""

import os
import re
from pathlib import Path

ARTICLES_DIR = "/sessions/sharp-upbeat-ptolemy/mnt/BLOG/new-articles"
REQUIRED_FIELDS = ['title', 'description', 'slug', 'image']

def extract_frontmatter(content):
    """Extract frontmatter and body from markdown file."""
    match = re.match(r'^---\n(.*?)\n---\n', content, re.DOTALL)
    if match:
        frontmatter_text = match.group(1)
        return parse_yaml_frontmatter(frontmatter_text)
    return {}

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

def verify_files():
    """Verify all markdown files have required frontmatter fields."""
    md_files = sorted([f for f in os.listdir(ARTICLES_DIR) if f.endswith('.md') and f != 'verify_frontmatter.py' and f != 'fix_frontmatter.py'])
    
    print(f"Verifying frontmatter for {len(md_files)} articles...\n")
    print("=" * 100)
    
    issues = []
    all_good = 0
    
    for md_file in md_files:
        filepath = os.path.join(ARTICLES_DIR, md_file)
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        frontmatter = extract_frontmatter(content)
        
        file_issues = []
        for field in REQUIRED_FIELDS:
            if field not in frontmatter or not frontmatter[field]:
                file_issues.append(f"Missing or empty: {field}")
            elif field == 'title' and frontmatter[field] == "Untitled Article":
                file_issues.append(f"Invalid title: 'Untitled Article'")
            elif field == 'description' and len(frontmatter[field]) > 160:
                file_issues.append(f"Description too long: {len(frontmatter[field])} chars (max 160)")
        
        if file_issues:
            issues.append({'file': md_file, 'issues': file_issues})
            print(f"✗ {md_file}")
            for issue in file_issues:
                print(f"  - {issue}")
        else:
            all_good += 1
            print(f"✓ {md_file}")
            print(f"  Title: {frontmatter.get('title', 'N/A')[:60]}...")
            print(f"  Slug: {frontmatter.get('slug', 'N/A')}")
            print(f"  Description length: {len(frontmatter.get('description', ''))} chars")
    
    print("=" * 100)
    print(f"\nFinal Summary:")
    print(f"Total files: {len(md_files)}")
    print(f"Complete frontmatter: {all_good}")
    print(f"Issues found: {len(issues)}")
    
    if issues:
        print(f"\nFiles with issues:")
        for issue in issues:
            print(f"  {issue['file']}: {', '.join(issue['issues'])}")
    else:
        print(f"\n✓ All {len(md_files)} articles have complete and valid frontmatter!")

if __name__ == '__main__':
    verify_files()
