/**
 * Адрес страницы анализа и признак «у версии есть анализ» - без зависимостей: их импортируют
 * клиентские файлы (`BookActions`, `LanguageSwitcher`), и тянуть ради них hreflang-хелперы
 * `book-analysis.ts` в общий бандл нельзя (как `summary-path.ts`).
 */

/** Путь страницы анализа без языка: `/book/{slug}/analysis`. */
export function analysisPath(bookSlug: string): string {
  return `/book/${bookSlug}/analysis`;
}

/**
 * Есть ли у версии анализ: обзор книги и список книг отдают счётчик `_count.analyses` - запись
 * с ядром, не закрытая окончённой претензией на весь мир (`books/src/modules/book/book-card.ts`).
 * Блок по одной стране счётчик не обнуляет (F03 D8): кнопка, hreflang и карта сайта есть везде,
 * а в стране блока страницу закрывает 451 middleware. Счётчика нет - анализ не подтверждён, ссылку
 * на него не ставим.
 */
export function versionHasAnalysis(version: { _count?: { analyses?: number } }): boolean {
  const count = version._count?.analyses;
  return typeof count === 'number' && count > 0;
}
