import { ApiError } from '@/types/api';

/** The API said this URL has no such entity. */
export function isNotFoundError(error: unknown): boolean {
  return error instanceof ApiError && error.statusCode === 404;
}

/**
 * How a page must react when the request for its main content fails.
 *
 * Call from the `catch` around that request. A 404 is an answer — the entity
 * does not exist — and becomes `notFound()`. Anything else is *not* an answer,
 * and the error is rethrown so the page responds 5xx.
 *
 * The alternative, and what these pages used to do, is to swallow the failure
 * and render an empty list. That produces a confident 200 for a page that
 * simply failed to load, and since WP-5 stopped forcing `noindex` on an unknown
 * count, it would be a 200 + index + empty page — the worst of the three
 * outcomes. `fail-open` on the robots tag is right only once the content is on
 * the page; when the content itself is missing, the honest answer is 5xx and
 * "come back later".
 */
export function handleContentFailure(error: unknown, notFound: () => never): never {
  if (isNotFoundError(error)) notFound();
  throw error;
}
