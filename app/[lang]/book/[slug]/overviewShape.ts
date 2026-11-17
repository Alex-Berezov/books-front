import type { BookOverview, VersionPreview } from '@/types/api-schema';

type VersionCount = keyof NonNullable<VersionPreview['_count']>;

/**
 * 🔴 Обзор книги без полей, по которым решается «есть ли раздел» (пересказ, анализ, мир книги), -
 * отказ, а не ответ «раздела нет». Схема фронта написана руками: сузят белый список обзора
 * на бэкенде - и без этой проверки весь раздел ушёл бы в кэшируемый 404 при зелёных тестах.
 * Одна проверка на страницы разделов книги: `/summary` и его разделы, `/analysis`, `/wiki`.
 */
export function assertOverviewCarriesCount(
  book: BookOverview,
  supportedLang: string,
  slug: string,
  count: VersionCount,
  what: string
): void {
  if (!Array.isArray(book.versions)) {
    throw new Error(`Book overview for "${slug}" carries no versions array`);
  }
  const langVersion = book.versions.find((v) => v.language === supportedLang);
  if (langVersion && typeof langVersion._count?.[count] !== 'number') {
    throw new Error(`Book overview for "${slug}" carries no ${what} count`);
  }
}
