import type { Category, CategoryType, SupportedLang } from '@/types/api-schema';

/** Route segment each taxonomy type lives under. */
export const TAXONOMY_ROUTE_SEGMENT: Record<CategoryType, string> = {
  category: 'category',
  genre: 'genre',
  collection: 'collection',
};

export interface TaxonomyDestination {
  segment: string;
  slug: string;
}

/**
 * Where this request should have landed, or `null` if it is already there.
 *
 * Two independent ways to reach the wrong URL, both answering 200 today:
 *
 * 1. **Foreign slug.** The API resolves a taxonomy by the language slug and falls
 *    back to the base (English) `Category.slug`, so `/ru/genre/historical-fiction`
 *    renders the same page that already lives at `/ru/genre/istoricheskaya-proza`.
 * 2. **Wrong route segment.** Every term resolves under every segment, so a genre
 *    answers at `/en/category/gothic-fiction` and a collection at
 *    `/en/category/free-books` — the latter is what the book page linked to
 *    before the route split, so those URLs are already out there.
 *
 * Returns `null` when the term has no translation into this language: there is
 * no correct URL to send the visitor to, and the caller must answer 404 rather
 * than redirect to the address that was just rejected.
 */
export function resolveTaxonomyDestination(
  category: Category | null | undefined,
  lang: SupportedLang,
  requestedSegment: string,
  requestedSlug: string
): TaxonomyDestination | null {
  if (!category) return null;

  const translated =
    category.translations?.find((t) => t.language === lang) || category.translation;
  const slug = translated?.slug;
  // No slug in this language → nothing to point at. 404 is the caller's job.
  if (!slug) return null;

  const segment = category.type ? TAXONOMY_ROUTE_SEGMENT[category.type] : requestedSegment;

  if (slug === requestedSlug && segment === requestedSegment) return null;
  return { segment, slug };
}

/**
 * True when the term exists but cannot be addressed in this language.
 *
 * Rendering it anyway would put a foreign-language name under a localized URL,
 * which is the duplicate this phase removes — so the page answers 404 instead.
 */
export function isUnaddressableInLanguage(
  category: Category | null | undefined,
  lang: SupportedLang
): boolean {
  if (!category) return false;
  const translated =
    category.translations?.find((t) => t.language === lang) || category.translation;
  return !translated?.slug;
}
