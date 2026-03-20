import { createClient } from '@supabase/supabase-js';

// Server-side Supabase client (for API routes)
export function getSupabaseServer() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Standard JSON response helpers
export function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function errorResponse(message: string, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Merge translations into base content
// Takes a base record and its translation, returns merged object
export function mergeTranslation<T extends Record<string, unknown>>(
  base: T,
  translation: Record<string, unknown> | null,
  translationFields: string[]
): T {
  if (!translation) return base;

  const merged = { ...base };
  for (const field of translationFields) {
    if (translation[field]) {
      (merged as Record<string, unknown>)[field] = translation[field];
    }
  }
  return merged;
}
