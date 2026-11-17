import { analysisPath, pickAnalysisVersion } from '@/lib/seo/book-analysis';
import { versionHasWorld } from '@/lib/seo/world-path';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { BookOverview, VersionPreview } from '@/types/api-schema';
import { buildBookSectionContext } from '../bookSectionContext';

/**
 * Общее для страницы пересказа и страниц его разделов (F04-3) - сборка раздела книги
 * (`buildBookSectionContext`) с правилами пересказа: пересказ есть, анализ - по версии анализа
 * языка, мир - по версии пересказа. Одна сборка на обе страницы.
 */
export function buildSummaryBookContext(input: {
  book: BookOverview;
  version: VersionPreview;
  lang: SupportedLang;
  slug: string;
  dict: Dictionary;
}) {
  const { book, version, lang, slug } = input;
  const bookSlug = book.slug || slug;
  return buildBookSectionContext({
    ...input,
    hasSummary: true,
    analysisHref:
      pickAnalysisVersion(book, lang) !== null ? `/${lang}${analysisPath(bookSlug)}` : null,
    hasWorld: versionHasWorld(version),
  });
}
