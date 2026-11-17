import { getSummarySectionsSitemap } from '@/api/endpoints/public';
import { summarySectionPath } from '@/lib/seo/summary-path';
import { buildLangUrl } from '@/lib/seo/urls';
import {
  fetchPagedSitemapFile,
  fetchPagedSitemapTotal,
  isIsoDate,
  parsePagedSitemapFile,
} from '@/lib/sitemap/paged-sitemap';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { SitemapItem } from '@/lib/sitemap/utils';

/**
 * Карта разделов пересказа (F04 `tech.md` T10): файл `sitemap-summary-sections-{lang}-{n}.xml` -
 * ровно одна страница ручки `GET /{lang}/summary-sections/sitemap`. Элемент ручки - версия со всеми
 * своими разделами, поэтому размер файла - в версиях: 50 версий × не больше 200 разделов
 * (`SUMMARY_SECTION_LIMITS.sectionsPerVersion` на бэкенде) = 10 000 адресов, предел протокола.
 * Версии под блоком окончённой претензии на весь мир и книги с редакторским `noindex` ручка
 * не отдаёт (`product.md` §6 п.1, п.4; страновой блок версию не убирает - правило владельца
 * 07.11.2026, `T163`).
 */
// Копия потолка `limit` ручки (`SUMMARY_SECTIONS_SITEMAP_MAX_LIMIT` в
// `books/src/modules/book-summary/dto/book-summary-sections-sitemap-query.dto.ts`): больше - 400 и
// 503 на каждом файле карты. Менять вместе.
export const SUMMARY_SECTIONS_SITEMAP_PAGE_SIZE = 50;

export const SUMMARY_SECTIONS_SITEMAP_PREFIX = 'sitemap-summary-sections';

export const parseSummarySectionsSitemapFile = (
  filename: string,
  supportedLangs: readonly string[]
) => parsePagedSitemapFile(SUMMARY_SECTIONS_SITEMAP_PREFIX, filename, supportedLangs);

/** Число версий с разделами на языке - для индекса карты; `null` - счёт неизвестен (`LEGACY-082`). */
export const fetchSummarySectionsTotal = (lang: string): Promise<number | null> =>
  fetchPagedSitemapTotal(getSummarySectionsSitemap, lang);

/**
 * Адреса одного файла. Усечённая страница, ответ не той формы или раздел без даты - отказ
 * (файл отвечает 503), а не похудевшая карта: `lastmod` - дата раздела (§6 п.1), подставить
 * вместо неё «сейчас» значит звать краулер перечитывать всё при каждом обходе.
 */
export async function buildSummarySectionsSitemapItems(
  lang: SupportedLang,
  page: number,
  fetchPage = getSummarySectionsSitemap
): Promise<SitemapItem[]> {
  const where = `summary-sections ${lang} file${page}`;
  const versions = await fetchPagedSitemapFile(
    fetchPage,
    lang,
    page,
    SUMMARY_SECTIONS_SITEMAP_PAGE_SIZE,
    where
  );
  return versions.flatMap((version) => {
    if (typeof version?.slug !== 'string' || !version.slug || !Array.isArray(version.sections)) {
      throw new Error(`${where}: версия не той формы`);
    }
    return version.sections.map((section) => {
      if (!Number.isInteger(section?.number) || !isIsoDate(section.lastmod)) {
        throw new Error(`${where}: раздел версии "${version.slug}" не той формы`);
      }
      // Без hreflang (`tech.md` T10): пары «раздел ↔ раздел» между языками нет (T9).
      return {
        url: buildLangUrl(lang, summarySectionPath(version.slug, section.number)),
        lastModified: section.lastmod,
        changeFrequency: 'weekly' as const,
        priority: 0.6,
      };
    });
  });
}
