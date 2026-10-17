/**
 * Ленивая загрузка проверок анализа (`book-analysis-validation.ts`, на `zod`). Один промис на
 * сессию: окно импорта, редакторы списков и сохранение ждут один и тот же модуль.
 * Сбой загрузки не запоминается — следующая попытка грузит заново.
 */

export type BookAnalysisValidation = typeof import('./book-analysis-validation');

let pending: Promise<BookAnalysisValidation> | null = null;

export const loadBookAnalysisValidation = (): Promise<BookAnalysisValidation> => {
  pending ??= import('./book-analysis-validation').catch((error: unknown) => {
    pending = null;
    throw error;
  });
  return pending;
};
