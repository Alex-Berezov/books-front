import type { ApiError } from '@/types/api';

/**
 * Коды отказа, которые экран разбирает сам: общий тост 5xx из `providers/AppProviders.tsx`
 * на них не показывается. Иначе на ожидаемый отказ админ видит два сообщения — свою плашку
 * с причиной и общее «ошибка сервера» поверх неё (F05-1s, 503 `LLM_MODELS_UNAVAILABLE`).
 *
 * Запрос или мутация объявляет коды в `meta`: `meta: localErrorCodes(['CODE'])`. Прочие 5xx
 * того же запроса по-прежнему дают общий тост.
 */
export const localErrorCodes = (codes: readonly string[]) => ({ localErrorCodes: codes });

export const isHandledLocally = (
  error: ApiError,
  meta: Record<string, unknown> | undefined
): boolean => {
  const codes = meta?.localErrorCodes;
  const code = error.data?.code;
  return Array.isArray(codes) && typeof code === 'string' && codes.includes(code);
};
