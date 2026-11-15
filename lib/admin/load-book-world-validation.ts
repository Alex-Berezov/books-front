/**
 * Ленивая загрузка проверок мира книги (`book-world-validation.ts`, на `zod`). Один промис на
 * сессию: окно импорта и карточка сущности ждут один и тот же модуль.
 * Сбой загрузки не запоминается — следующая попытка грузит заново.
 */

export type BookWorldValidation = typeof import('./book-world-validation');

let pending: Promise<BookWorldValidation> | null = null;

export const loadBookWorldValidation = (): Promise<BookWorldValidation> => {
  pending ??= import('./book-world-validation').catch((error: unknown) => {
    pending = null;
    throw error;
  });
  return pending;
};
