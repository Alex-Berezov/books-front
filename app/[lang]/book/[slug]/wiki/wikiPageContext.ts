import { fillTemplate } from '@/lib/book-world/format';
import { getAnalysisStrings } from '@/lib/i18n/analysisStrings';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { getWorldStrings } from '@/lib/i18n/worldStrings';
import { analysisPath, versionHasAnalysis } from '@/lib/seo/analysis-path';
import { pickSummaryVersion, summaryPath } from '@/lib/seo/book-summary';
import { worldPageSlug } from '@/lib/seo/book-world';
import { formatLongDateUtc } from '@/lib/utils/date';
import type { ChapterLinker } from '../analysis/AnalysisBlocks';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { BookOverview, VersionPreview } from '@/types/api-schema';
import { buildBookSectionContext } from '../bookSectionContext';
import { readerChapterHref } from '../read/chapterParam';

/**
 * Всё, что общая страница мира и страница героя берут из книги одинаково: сборка раздела книги
 * (`buildBookSectionContext`, общая с пересказом) плюс словари мира и ссылки соседних разделов.
 */
export function buildWorldPageContext(input: {
  book: BookOverview;
  version: VersionPreview;
  lang: SupportedLang;
  slug: string;
}) {
  const { book, version, lang, slug } = input;
  const dict = getDictionary(lang);
  const t = dict.book;
  const bookSlug = book.slug || slug;
  const ownSlug = worldPageSlug(version, book, slug);
  const summary =
    pickSummaryVersion(book, lang) !== null
      ? { href: `/${lang}${summaryPath(bookSlug)}`, label: t.summary }
      : null;
  const section = buildBookSectionContext({
    book,
    version,
    lang,
    slug,
    dict,
    hasSummary: summary !== null,
    analysisHref: versionHasAnalysis(version) ? `/${lang}${analysisPath(bookSlug)}` : null,
    // Пункт этих страниц - активный, он есть всегда.
    hasWorld: true,
  });

  return {
    ...section,
    dict,
    t,
    strings: getWorldStrings(lang),
    analysisStrings: getAnalysisStrings(lang),
    ownSlug,
    bookCardHref: `/${lang}/book/${ownSlug}`,
    read: section.readHref ? { href: section.readHref, label: t.readFullBook } : null,
    listen: section.listenHref ? { href: section.listenHref, label: t.listenAudiobook } : null,
    summary,
  };
}

/** Ссылка «глава N»: номер есть в списке `chapterNumbers` - ссылка в читалку, нет - номер текстом. */
export function buildChapterLinker(
  bookHref: string,
  chapterLabel: string,
  chapterNumbers: ReadonlySet<number>
): ChapterLinker {
  return {
    label: (n) => fillTemplate(chapterLabel, { n }),
    href: (n) => (chapterNumbers.has(n) ? readerChapterHref(bookHref, n) : null),
  };
}

/** Дата подписи «Обновлено …»; неразборчивая дата - без неё. */
export function formatWorldDate(
  iso: string | null,
  lang: SupportedLang,
  template: string
): string | undefined {
  if (!iso) return undefined;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return undefined;
  return fillTemplate(template, { date: formatLongDateUtc(date, lang) });
}
