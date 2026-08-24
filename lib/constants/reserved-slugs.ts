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
 *
 * ⚠️ Removing a route does **not** mean removing its name from here, and
 * `versions` is the standing example (`LEGACY-203`, 15.08.2026): the page at
 * `/:lang/versions/:id` was deleted, but the name stays reserved. A CMS page
 * saved under a freed name inherits every old link, bookmark and cached copy of
 * the route that used to live there — a player address would start answering
 * with an article. Freeing a name is a separate, deliberate decision, and it
 * takes a paired commit in `books` — that copy is what rejects the save.
 *
 * ⚠️ Nothing on the pipeline defends a name that outlived its route. The guard
 * only checks one direction (a route must be listed), and its cross-check
 * against the backend copy runs solely when `../books` sits next to this repo —
 * CI checks out one repository, so there the cross-check is skipped, not failed.
 * A tidy-up that drops `versions` from both lists would stay green everywhere.
 * The one red is `__tests__/lib/constants/reservedSlugs.test.ts`.
 */
export const RESERVED_SLUGS = [
  '403',
  'audiobooks',
  'auth',
  'author',
  'authors',
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
