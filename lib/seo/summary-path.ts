/**
 * Адрес страницы пересказа и признак «у версии есть пересказ» - без зависимостей: их импортируют
 * клиентские файлы (`BookActions`, `LanguageSwitcher`, карточка), и тянуть ради них санитайзер
 * и hreflang-хелперы `book-summary.ts` в общий бандл нельзя.
 */

/** Якорь блока «Очень кратко» на странице пересказа: на него ведут страницы разделов (F04). */
export const SUMMARY_BRIEF_ANCHOR = 'brief';

/** Путь страницы пересказа без языка: `/book/{slug}/summary`. */
export function summaryPath(bookSlug: string): string {
  return `/book/${bookSlug}/summary`;
}

/** Путь страницы раздела пересказа без языка: `/book/{slug}/summary/{n}` (F04, D1). */
export function summarySectionPath(bookSlug: string, n: number): string {
  return `${summaryPath(bookSlug)}/${n}`;
}

/**
 * Есть ли у версии пересказ: обзор книги и список книг отдают счётчик `_count.summaries`.
 * Счётчика нет - пересказ не подтверждён, ссылку на него не ставим.
 */
export function versionHasSummary(version: { _count?: { summaries: number } }): boolean {
  const count = version._count?.summaries;
  return typeof count === 'number' && count > 0;
}
