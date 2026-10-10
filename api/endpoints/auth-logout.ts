import { AUTH_REQUEST_TIMEOUTS } from '@/lib/auth/constants';
import { API_BASE_URL } from '@/lib/http.constants';
import type { RefreshRequest } from '@/types/api-schema';

/**
 * Гасит все сессии пользователя на бэкенде: `POST /auth/logout` с refresh (`LEGACY-451`).
 *
 * Отдельный модуль, а не `api/endpoints/auth.ts`: функция серверная — её зовёт только серверное
 * действие выхода (`lib/auth/revoke-sessions.action.ts`), refresh живёт в серверной JWT-куке и
 * в браузер не отдаётся (`LEGACY-446`). Модуль `auth.ts` тянут клиентские компоненты, и через
 * него серверное действие тянуло бы в свой граф http-клиент с `next-auth/react`.
 *
 * Голый `fetch`, а не `http*`: ручка авторизуется телом, а не заголовком, и отказ здесь не
 * бросается — выход не ждёт бэкенд дольше `AUTH_REQUEST_TIMEOUTS.LOGOUT_MS` и не падает от его
 * отказа. refresh не логируется — он остаётся только в теле запроса.
 *
 * @param visitorIpHeader — адрес посетителя (`visitorIpHeaderFrom`): с сервера Next все выходы
 *   сайта иначе приходят с одного адреса и делят одну корзину лимита (`LEGACY-064`).
 */
export async function revokeBackendSessions(
  refreshToken: unknown,
  visitorIpHeader: Record<string, string> = {}
): Promise<void> {
  if (typeof refreshToken !== 'string' || !refreshToken) return;
  const body: RefreshRequest = { refreshToken };
  try {
    const response = await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...visitorIpHeader },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(AUTH_REQUEST_TIMEOUTS.LOGOUT_MS),
    });
    if (!response.ok) console.error('Backend logout refused:', response.status);
  } catch {
    console.error('Backend logout failed');
  }
}
