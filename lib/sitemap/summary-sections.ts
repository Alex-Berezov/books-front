import { getSummarySectionsSitemap } from '@/api/endpoints/public';
import { summarySectionPath } from '@/lib/seo/summary-path';
import { buildLangUrl } from '@/lib/seo/urls';
import { fetchPageWindow, type SitemapItem } from '@/lib/sitemap/utils';
import type { SupportedLang } from '@/lib/i18n/lang';

/**
 * Карта разделов пересказа (F04 `tech.md` T10): файл `sitemap-summary-sections-{lang}-{n}.xml` -
 * ровно одна страница ручки `GET /{lang}/summary-sections/sitemap`. Элемент ручки - версия со всеми
 * своими разделами, поэтому размер файла - в версиях: 50 версий × не больше 200 разделов
 * (`SUMMARY_SECTION_LIMITS.sectionsPerVersion` на бэкенде) = 10 000 адресов, предел протокола.
 * Версии с претензией и книги с редакторским `noindex` ручка не отдаёт (`product.md` §6 п.1, п.4).
 */
// Копия потолка `limit` ручки (`SUMMARY_SECTIONS_SITEMAP_MAX_LIMIT` в
// `books/src/modules/book-summary/dto/book-summary-sections-sitemap-query.dto.ts`): больше - 400 и
// 503 на каждом файле карты. Менять вместе.
export const SUMMARY_SECTIONS_SITEMAP_PAGE_SIZE = 50;

export const SUMMARY_SECTIONS_SITEMAP_PREFIX = 'sitemap-summary-sections';

const FILE_PATTERN = new RegExp(
  `^${SUMMARY_SECTIONS_SITEMAP_PREFIX}-([a-z]{2})-([1-9][0-9]*)\\.xml$`
);

/** Потолок `page` ручки (`SUMMARY_SECTIONS_SITEMAP_MAX_PAGE` на бэкенде): дальше - 404, а не 400 → 503. */
const MAX_FILE_PAGE = 10_000;

export function parseSummarySectionsSitemapFile(
  filename: string,
  supportedLangs: readonly string[]
): { lang: SupportedLang; page: number } | null {
  const match = FILE_PATTERN.exec(filename);
  if (!match || !supportedLangs.includes(match[1])) return null;
  const page = Number(match[2]);
  if (!Number.isInteger(page) || page < 1 || page > MAX_FILE_PAGE) return null;
  return { lang: match[1] as SupportedLang, page };
}

/** Число версий с разделами на языке - для индекса карты; `null` - счёт неизвестен (`LEGACY-082`). */
export async function fetchSummarySectionsTotal(lang: string): Promise<number | null> {
  const res = await getSummarySectionsSitemap(lang as SupportedLang, 1, 1);
  const total = res?.pagination?.total;
  return typeof total === 'number' && Number.isFinite(total) ? total : null;
}

const isIsoDate = (value: unknown): value is string =>
  typeof value === 'string' && !Number.isNaN(Date.parse(value));

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
  // Окно из одной страницы: проверка полноты и одна повторная попытка на 429 лимитера
  // (`LEGACY-064`) - те же, что у файлов книг.
  const versions = await fetchPageWindow(
    (p) => fetchPage(lang, p, SUMMARY_SECTIONS_SITEMAP_PAGE_SIZE),
    page,
    1,
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
