// Utility functions for language-aware field access
// Used by the tour editor to handle multilingual content fields

/**
 * Returns the field key with language suffix.
 * For English ('en'), returns the base field name.
 * For other languages, returns baseName_langCode (e.g. 'name_de').
 */
export function getFieldKey(baseName: string, lang: string): string {
  if (!lang || lang === 'en') return baseName;
  return `${baseName}_${lang}`;
}

/**
 * Gets an array field from formData, handling both parsed arrays and JSON strings.
 * Falls back to the English version if the language-specific version doesn't exist.
 */
export function getParsedArrayField(
  formData: Record<string, any>,
  fieldName: string,
  lang: string
): any[] {
  const key = getFieldKey(fieldName, lang);
  let value = formData[key];

  // Fall back to English if no language-specific value
  if ((value === undefined || value === null) && lang !== 'en') {
    value = formData[fieldName];
  }

  if (!value) return [];

  // If it's already an array, return it
  if (Array.isArray(value)) return value;

  // Try to parse JSON string
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
}

/**
 * Gets a rich text field from formData with language awareness.
 * Falls back to the English version if the language-specific version doesn't exist.
 */
export function getRichTextField(
  formData: Record<string, any>,
  fieldName: string,
  lang: string
): string {
  const key = getFieldKey(fieldName, lang);
  let value = formData[key];

  // Fall back to English if no language-specific value
  if ((value === undefined || value === null || value === '') && lang !== 'en') {
    value = formData[fieldName];
  }

  if (typeof value === 'string') return value;
  if (value === null || value === undefined) return '';

  return String(value);
}
