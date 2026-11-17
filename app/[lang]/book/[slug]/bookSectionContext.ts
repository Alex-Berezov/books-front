import { worldNavLabel } from '@/lib/i18n/worldStrings';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { BookOverview, VersionPreview } from '@/types/api-schema';
import { resolveAuthorHref } from './authorHref';
import { buildBookSectionNavItems } from './BookSectionNav';

/**
 * Общее для страниц разделов книги (пересказ и его разделы F04-3, мир книги F08-3b): адреса книги,
 * автор, год, жанр, ссылки «Читать» / «Слушать» и навигация по разделам книги. Одна сборка - чтобы
 * правило «есть ли у книги текст» или подписи навигации не разошлись между разделами. Есть ли
 * пересказ, анализ и мир, решает страница раздела (правила выбора версии у разделов разные).
 */
export function buildBookSectionContext(input: {
  book: BookOverview;
  version: VersionPreview;
  lang: SupportedLang;
  slug: string;
  dict: Dictionary;
  hasSummary: boolean;
  analysisHref: string | null;
  hasWorld: boolean;
}) {
  const { book, version, lang, slug, dict } = input;
  const bookSlug = book.slug || slug;
  const bookHref = `/${lang}/book/${bookSlug}`;
  const readHref = book.versionIds?.text ? `${bookHref}/read` : null;
  const listenHref = book.versionIds?.audio ? `${bookHref}/listen` : null;

  const navItems = buildBookSectionNavItems({
    lang,
    bookSlug,
    hasText: Boolean(readHref),
    hasAudio: Boolean(listenHref),
    hasSummary: input.hasSummary,
    hasAnalysis: Boolean(input.analysisHref),
    hasWorld: input.hasWorld,
    labels: {
      book: dict.book.bookNavBook,
      read: dict.book.read,
      listen: dict.book.listen,
      summary: dict.book.summary,
      analysis: dict.book.analysis,
      world: worldNavLabel(lang),
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
    analysisHref: input.analysisHref,
    navItems,
  };
}
