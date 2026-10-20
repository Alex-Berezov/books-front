import { analysisPath, pickAnalysisVersion } from '@/lib/seo/book-analysis';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { BookOverview, VersionPreview } from '@/types/api-schema';
import { resolveAuthorHref } from '../authorHref';
import { buildBookSectionNavItems } from '../BookSectionNav';

/**
 * Общее для страницы пересказа и страниц его разделов (F04-3): адреса книги, автор, год, жанр,
 * ссылки «Читать» / «Слушать» / «Анализ» и навигация по разделам книги. Одна сборка на обе
 * страницы: правило «есть ли у книги анализ» или «есть ли текст» не должно разойтись между ними.
 */
export function buildSummaryBookContext(input: {
  book: BookOverview;
  version: VersionPreview;
  lang: SupportedLang;
  slug: string;
  dict: Dictionary;
}) {
  const { book, version, lang, slug, dict } = input;
  const bookSlug = book.slug || slug;
  const bookHref = `/${lang}/book/${bookSlug}`;
  const readHref = book.versionIds?.text ? `${bookHref}/read` : null;
  const listenHref = book.versionIds?.audio ? `${bookHref}/listen` : null;
  const analysisHref =
    pickAnalysisVersion(book, lang) !== null ? `/${lang}${analysisPath(bookSlug)}` : null;

  const navItems = buildBookSectionNavItems({
    lang,
    bookSlug,
    hasText: Boolean(readHref),
    hasAudio: Boolean(listenHref),
    hasSummary: true,
    hasAnalysis: Boolean(analysisHref),
    labels: {
      book: dict.book.bookNavBook,
      read: dict.book.read,
      listen: dict.book.listen,
      summary: dict.book.summary,
      analysis: dict.book.analysis,
    },
  });

  return {
    bookSlug,
    bookHref,
    title: version.title || book.title,
    authorName: version.author || book.author || dict.book.unknownAuthor,
    authorHref: resolveAuthorHref(version.authorPageUrl, book.authorSlug ?? null, lang),
    year: book.firstPublishedYear ? String(book.firstPublishedYear) : null,
    genre: book.primaryCategory?.name ?? null,
    readHref,
    listenHref,
    analysisHref,
    navItems,
  };
}
