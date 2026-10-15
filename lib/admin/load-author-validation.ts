/**
 * Ленивая загрузка проверок данных автора (`author-validation.ts`, на `zod`). Один промис на
 * сессию: окно импорта, редакторы блоков и сохранение ждут один и тот же модуль.
 * Сбой загрузки не запоминается — следующая попытка грузит заново.
 */

export type AuthorValidation = typeof import('./author-validation');

let pending: Promise<AuthorValidation> | null = null;

export const loadAuthorValidation = (): Promise<AuthorValidation> => {
  pending ??= import('./author-validation').catch((error: unknown) => {
    pending = null;
    throw error;
  });
  return pending;
};
