export function sanitizeHtml(html: string): string {
  if (!html) return '';

  // List of allowed tags
  const allowedTags = ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 'a', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'span', 'div'];

  // Parse and sanitize
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  function sanitizeNode(node: Node): void {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as Element;
      const tagName = element.tagName.toLowerCase();

      if (!allowedTags.includes(tagName)) {
        // Replace element with its text content
        while (element.firstChild) {
          element.parentNode?.insertBefore(element.firstChild, element);
        }
        element.remove();
      } else {
        // Remove all attributes except href for links
        if (tagName !== 'a') {
          Array.from(element.attributes).forEach(attr => {
            element.removeAttribute(attr.name);
          });
        } else {
          // For links, only keep href and validate it
          const href = element.getAttribute('href') || '';
          element.removeAttribute('href');
          element.setAttribute('target', '_blank');
          element.setAttribute('rel', 'noopener noreferrer');
          if (href && (href.startsWith('http') || href.startsWith('/'))) {
            element.setAttribute('href', href);
          }
        }
      }
    }

    // Recursively sanitize children
    Array.from(node.childNodes).forEach(child => sanitizeNode(child));
  }

  // Sanitize children of body — not body itself, since 'body' isn't
  // in allowedTags and removing it would null-out doc.body
  Array.from(doc.body.childNodes).forEach(child => sanitizeNode(child));
  return doc.body.innerHTML;
}
