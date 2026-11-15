import { ApiError } from '@/types/api';

/**
 * Разбор отказа ручки записи в админке (Analysis F03-1, World F08-1): одна копия на все вкладки.
 */

/**
 * Текст отказа: сервер отдаёт ошибки проверки массивом «путь: причина» — по строке на ошибку,
 * а не одной строкой через запятую, как его склеивает `ApiError`.
 */
export const errorText = (error: unknown, fallback = 'Check failed'): string => {
  if (error instanceof ApiError) {
    const raw = (error.data as { message?: unknown } | undefined)?.message;
    if (Array.isArray(raw)) return raw.map(String).join('\n');
  }
  return error instanceof Error ? error.message : fallback;
};

/** 5xx уже показал глобальный тост (`providers/AppProviders.tsx`), второй не нужен. */
export const isServerFailure = (error: unknown): boolean =>
  error instanceof ApiError && error.statusCode >= 500;

/** «Отвергнуты данные» — только ответ проверки (400, 422); права, лимит, пропажа — сбой. */
export const isDataRejected = (error: unknown): boolean =>
  error instanceof ApiError && (error.statusCode === 400 || error.statusCode === 422);

/** `code` отказа в теле (`AUTO_TEXT_NONE`, `WORLD_ENTITY_PUBLISHED`, …); нет — `null`. */
export const errorCode = (error: unknown): string | null => {
  if (!(error instanceof ApiError)) return null;
  const code = error.data?.code;
  return typeof code === 'string' ? code : null;
};
