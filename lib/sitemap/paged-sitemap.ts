import { fetchPageWindow, type PagedResponse } from '@/lib/sitemap/utils';
import type { SupportedLang } from '@/lib/i18n/lang';

/**
 * Общее у карт «файл = одна страница ручки» (разделы пересказа F04 T10, мир книги F08-3b): разбор
 * имени файла `{prefix}-{lang}-{n}.xml`, счёт для индекса карты и выборка одного файла с проверкой
 * полноты. Размер страницы у каждой карты свой - копия потолка `limit` её ручки.
 */

/** Ручка карты: страница `page` по `limit` элементов на языке `lang`. */
export type PagedSitemapFetch<T> = (
  lang: SupportedLang,
  page: number,
  limit: number
) => Promise<PagedResponse<T>>;

/** Потолок номера файла (`page` ручек карты на бэкенде): дальше - 404, а не 400 → 503. */
const MAX_FILE_PAGE = 10_000;

/** Разбор имени файла карты: язык из списка и номер 1…10 000, иначе `null` (файл отвечает 404). */
export function parsePagedSitemapFile(
  prefix: string,
  filename: string,
  supportedLangs: readonly string[]
): { lang: SupportedLang; page: number } | null {
  const match = new RegExp(`^${prefix}-([a-z]{2})-([1-9][0-9]*)\\.xml$`).exec(filename);
  if (!match || !supportedLangs.includes(match[1])) return null;
  const page = Number(match[2]);
  if (!Number.isInteger(page) || page < 1 || page > MAX_FILE_PAGE) return null;
  return { lang: match[1] as SupportedLang, page };
}

/** Число элементов ручки на языке - для индекса карты; `null` - счёт неизвестен (`LEGACY-082`). */
export async function fetchPagedSitemapTotal<T>(
  fetchPage: PagedSitemapFetch<T>,
  lang: string
): Promise<number | null> {
  const res = await fetchPage(lang as SupportedLang, 1, 1);
  const total = res?.pagination?.total;
  return typeof total === 'number' && Number.isFinite(total) ? total : null;
}

/**
 * Элементы одного файла: окно из одной страницы ручки - проверка полноты и одна повторная попытка
 * на 429 лимитера (`LEGACY-064`), те же, что у файлов книг. Усечение - отказ (файл отвечает 503).
 */
export function fetchPagedSitemapFile<T>(
  fetchPage: PagedSitemapFetch<T>,
  lang: SupportedLang,
  page: number,
  pageSize: number,
  where: string
): Promise<T[]> {
  return fetchPageWindow((p) => fetchPage(lang, p, pageSize), page, 1, pageSize, where);
}

/** Дата ISO, которую разбирает `Date.parse`: `lastmod` без неё - отказ, а не «сейчас». */
export const isIsoDate = (value: unknown): value is string =>
  typeof value === 'string' && !Number.isNaN(Date.parse(value));
