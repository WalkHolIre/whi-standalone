#!/bin/bash
for file in $(find . -maxdepth 1 -name "*.html" ! -name "index.html" ! -name "checkout.html" | sort); do
  echo "=== $file ==="
  # Extract from <main> to the first </section>
  sed -n '/<main/,/<\/section>/p' "$file" | head -100 | grep -E 'section|img|background-image|url\(' | head -5
done
