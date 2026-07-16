import type { BookCardModel, BookOverview, SupportedLang } from '@/types/api-schema';

/**
 * Map a full BookOverview to a compact BookCardModel.
 *
 * Temporary compatibility mapper used in R1 by pages that still fetch the legacy
 * `getPublicBooks` endpoint (homepage, author, tag, taxonomy, catalog). These pages
 * will switch to compact `/cards` endpoints in R2, after which this mapper is removed.
 *
 * TODO(R2): remove this mapper after all consumers use BookCardModel from /cards endpoints.
 */
export const toBookCardModel = (book: BookOverview, lang: SupportedLang): BookCardModel => {
  const currentLangVersion = book.versions?.find(
    (v) => v.language === lang && v.status === 'published'
  );
  const displayVersion =
    currentLangVersion ||
    book.versions?.find((v) => v.status === 'published') ||
    book.versions?.[0];

  const title = displayVersion?.title || book.title || '';
  const author = displayVersion?.author || book.author || '';
  const coverImageUrl =
    displayVersion?.coverImageUrl ||
    displayVersion?.coverUrl ||
    book.coverImageUrl ||
    book.coverUrl ||
    null;

  const hasText =
    book.versions?.some(
      (v) => v.language === lang && v.status === 'published' && v.type === 'text'
    ) ??
    book.hasText ??
    false;
  const hasAudio =
    book.versions?.some(
      (v) => v.language === lang && v.status === 'published' && v.type === 'audio'
    ) ??
    book.hasAudio ??
    false;

  // BookOverview (legacy) does not expose BookVersion.publishedAt on the version preview,
  // so for the compatibility mapper we fall back to the book's createdAt honestly.
  // The compact /related and /cards endpoints return the real BookVersion.publishedAt.
  const publishedAt: string | null = book.createdAt ?? null;

  return {
    id: book.id,
    slug: displayVersion?.slug || book.slug || book.id,
    title,
    author,
    authorSlug: author ? author.trim().toLowerCase().replace(/\s+/g, '-') : null,
    coverImageUrl,
    rating: book.rating ?? null,
    ratingsCount: 0,
    hasText,
    hasAudio,
    publishedAt,
  };
};

/**
 * Map an array of BookOverview to BookCardModel[].
 */
export const toBookCardModels = (books: BookOverview[], lang: SupportedLang): BookCardModel[] =>
  books.map((b) => toBookCardModel(b, lang));
