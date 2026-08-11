/**
 * Route segments this app serves directly under `/:lang`.
 *
 * A CMS page slug lands in exactly this position, and App Router resolves a
 * static segment before the `[...slug]` catch-all — always. So a page saved as
 * `catalog` is not a page with a conflict, it is a page with no address.
 *
 * The authority that *enforces* this is the backend (`books`, which rejects such
 * a slug on save); this copy exists so the rule can be checked where the routes
 * actually live. `yarn check:reserved-slugs` fails when `app/[lang]/` grows a
 * segment absent from this list, and — when the sibling backend repo is present —
 * when the two lists have drifted apart. Same arrangement as `SUPPORTED_LANGS`.
 *
 * Adding a route means adding it here in the same commit. That is the whole
 * point of the guard: it turns a silent future collision into a red build now.
 */
export const RESERVED_SLUGS = [
  '403',
  'audiobooks',
  'auth',
  'author',
  'book',
  'bookshelf',
  'catalog',
  'categories',
  'category',
  'collection',
  'collections',
  'deletion',
  'genre',
  'genres',
  'listen',
  'new-releases',
  'popular-books',
  'privacy',
  'profile',
  'read',
  'summary',
  'tag',
  'tags',
  'terms',
  'versions',
] as const;

const RESERVED_SLUG_SET: ReadonlySet<string> = new Set(RESERVED_SLUGS);

/** True when the slug would be shadowed by a route of this app. */
export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUG_SET.has(slug.trim().toLowerCase());
}
