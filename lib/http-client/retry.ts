/**
 * Retry logic for HTTP requests
 *
 * Handles retry attempts on 401 errors (with token refresh).
 * 429 on `next build` is retried once by `httpGet` in `lib/http.ts` (LEGACY-411) - do not add a second retry here.
 */

import { ApiError } from '@/types/api';
import { handleAuthFailure, isLiveSession, refreshCurrentSession } from './auth';

/**
 * Wrapper for HTTP request with automatic retry on 401
 *
 * Повтор есть только у запроса через серверный прокси (`LEGACY-465`): прокси токен не продлевает,
 * поэтому сессия берётся мимо кэша — `/api/auth/session` продлевает истёкший access и пишет куку,
 * и повтор через прокси уходит уже с новым токеном. Сессии нет или она окончена окончательно
 * (`isLiveSession`) — выход; временный отказ продления — 401 наружу без повтора и без выхода;
 * повтор — только при сессии без `error`. Прямой запрос (явный токен с сервера, аноним) продлить нечем —
 * его 401 уходит вызывающему как есть, без выхода.
 *
 * @param requestFn - Function performing HTTP request
 * @param retry401 - Enable retry on 401 (automatic refresh)
 * @param viaBackendProxy - Запрос шёл через серверный прокси
 * @returns Request result
 * @throws ApiError if all attempts exhausted
 */
export const withAuthRetry = async <T>(
  requestFn: () => Promise<T>,
  retry401: boolean,
  viaBackendProxy = false
): Promise<T> => {
  let firstError: unknown;
  try {
    return await requestFn();
  } catch (error) {
    if (!(error instanceof ApiError && error.isUnauthorized() && retry401 && viaBackendProxy)) {
      throw error;
    }
    firstError = error;
  }

  // Сессия мертва — выход. Один вызов `handleAuthFailure` на любой исход: прежде внутренняя
  // ветка и внешний `catch` звали его дважды.
  const failAuth = async (reason: unknown): Promise<never> => {
    await handleAuthFailure();
    throw reason;
  };

  let session;
  try {
    session = await refreshCurrentSession();
  } catch (refreshError) {
    return failAuth(refreshError);
  }
  if (!isLiveSession(session)) return failAuth(firstError);
  // Временный отказ продления (`REFRESH_TOKEN_ERROR` с паузой): в куке тот же протухший токен,
  // повтор заранее бесполезен и второй раз отправил бы тело загрузки. Сессия может ожить —
  // поэтому и не выход: первый 401 уходит вызывающему (решение арбитра 12.10.2026, круг 2).
  if (session.error) throw firstError;

  try {
    return await requestFn();
  } catch (retryError) {
    // Второй 401 после свежей сессии — сессия не помогла: выход, как и прежде. Прочий отказ
    // повтора (5xx, сеть) — не повод выходить: прежде внешний `catch` выводил и на нём.
    if (retryError instanceof ApiError && retryError.isUnauthorized()) {
      return failAuth(retryError);
    }
    throw retryError;
  }
};
