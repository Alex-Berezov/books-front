import { BACKEND_PROXY_HEADER, BACKEND_PROXY_HEADER_VALUE } from '@/lib/backend-proxy.constants';
import { WORLD_BEACON_PATH } from '@/lib/world-beacon';
import type { WorldBeaconRequest } from '@/types/api-schema';

/**
 * Одно событие счётчика мира книги (F08-3b, `product.md` §14): собственный маршрут фронта
 * `app/api/world/beacon`, а не ручка бэкенда.
 *
 * Голый `fetch`, а не `http*`: клиент из `lib/http.ts` ходит на `API_BASE_URL` бэкенда, а событие
 * должно пройти через маршрут фронта - он ставит `X-Visitor-IP`, по которому API считает лимит.
 * JSON и `keepalive` (переживает уход со страницы), без кук и без идентификатора посетителя;
 * `navigator.sendBeacon` с текстом не годится - бэкенд отвечает 400 на не-JSON. Ошибка сети,
 * синхронное исключение и любой ответ молча глотаются: счётчик не должен ломать страницу.
 */
export function sendWorldBeacon(body: WorldBeaconRequest): void {
  try {
    const requestHeaders = new Headers({ 'Content-Type': 'application/json' });
    requestHeaders.set(BACKEND_PROXY_HEADER, BACKEND_PROXY_HEADER_VALUE);
    fetch(WORLD_BEACON_PATH, {
      method: 'POST',
      headers: requestHeaders,
      body: JSON.stringify(body),
      keepalive: true,
      credentials: 'omit',
      // POST не кэшируется и так; режим назван явно по правилу публичных выборок (`LEGACY-145`).
      cache: 'no-store',
    }).catch(() => undefined);
  } catch {
    // Счётчик не обязан дойти.
  }
}
