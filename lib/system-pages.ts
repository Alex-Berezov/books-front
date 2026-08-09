/**
 * Пять страниц, которые сайт ищет сам: главная и четыре хаба таксономий.
 *
 * До 09.08.2026 адресом служил слаг. Слаг админка генерирует из заголовка, то
 * есть функциональный контракт лежал в поле, которое меняется по совершенно
 * другой причине: переименование заголовка рвало связь, и это не давало ошибки —
 * главная переходила на словарные строки, хабы молча теряли metaTitle,
 * metaDescription, h1, SEO-текст и FAQ. На проде это случилось: `homepage-index`
 * стал `homepage` на обычном сохранении.
 *
 * `Page.systemKey` редактору недоступен: поля нет в DTO страниц, и бэкенд
 * отвечает 400 на попытку его прислать. Слаг вернулся к роли обычного поля —
 * его правка меняет публичный адрес (и оставляет 308), но больше ничего не рвёт.
 *
 * Значения обязаны совпадать с `SYSTEM_PAGE_KEYS` в
 * `books/src/modules/seo/system-pages/system-pages.constants.ts`.
 */
export const SYSTEM_PAGE_KEYS = [
  'homepage',
  'taxonomy-categories',
  'taxonomy-genres',
  'taxonomy-collections',
  'taxonomy-tags',
] as const;

export type SystemPageKey = (typeof SYSTEM_PAGE_KEYS)[number];
