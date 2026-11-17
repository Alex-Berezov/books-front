/**
 * Адреса страниц мира книги и признак «у версии есть мир» - без зависимостей: их импортируют
 * клиентские файлы (`BookActions`, `LanguageSwitcher`, навигация), и тянуть ради них серверные
 * хелперы в общий бандл нельзя (как `analysis-path.ts`).
 */

/** Путь общей страницы мира книги без языка: `/book/{slug}/wiki`. */
export function worldPath(bookSlug: string): string {
  return `/book/${bookSlug}/wiki`;
}

/** Путь страницы сущности без языка: `/book/{slug}/wiki/{key}`; ключ один на все языки книги. */
export function worldEntityPath(bookSlug: string, entityKey: string): string {
  return `${worldPath(bookSlug)}/${entityKey}`;
}

/**
 * Есть ли у версии мир: обзор книги и список книг отдают `_count.worldEntities` - число публичных
 * сущностей (`isListed`, F08-1). Счётчика нет - мир не подтверждён, ссылку на него не ставим.
 * Общая страница существует, пока есть хотя бы одна публичная сущность (`product.md` §4).
 */
export function versionHasWorld(version: { _count?: { worldEntities?: number } }): boolean {
  const count = version._count?.worldEntities;
  return typeof count === 'number' && count > 0;
}
