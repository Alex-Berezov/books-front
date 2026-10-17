/**
 * Адрес страницы пересказа и признак «у версии есть пересказ» - без зависимостей: их импортируют
 * клиентские файлы (`BookActions`, `LanguageSwitcher`, карточка), и тянуть ради них санитайзер
 * и hreflang-хелперы `book-summary.ts` в общий бандл нельзя.
 */

/** Путь страницы пересказа без языка: `/book/{slug}/summary`. */
export function summaryPath(bookSlug: string): string {
  return `/book/${bookSlug}/summary`;
}

/**
 * Есть ли у версии пересказ: обзор книги и список книг отдают счётчик `_count.summaries`.
 * Счётчика нет - пересказ не подтверждён, ссылку на него не ставим.
 */
export function versionHasSummary(version: { _count?: { summaries: number } }): boolean {
  const count = version._count?.summaries;
  return typeof count === 'number' && count > 0;
}
