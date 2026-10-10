import { signOut } from 'next-auth/react';
import { revokeBackendSessionsAction } from '@/lib/auth/revoke-sessions.action';
import { clearLoggedInMarker } from '@/lib/auth/sessionMarker';

/**
 * Выход по кнопке — одно место на все кнопки (`LEGACY-451`, решение арбитра 10.10.2026).
 *
 * Порядок держит смысл, менять его нельзя:
 * 1. Сначала гасим сессии на бэкенде: после `signOut` куки с refresh уже нет. Отказ отзыва
 *    выход не блокирует — кука стирается в любом случае.
 * 2. Маркер входа снимается после отзыва: вкладка, закрытая во время его ожидания, оставила бы
 *    живую куку без маркера, и сайт до 15 минут считал бы вошедшего человека гостем.
 * 3. `signOut` стирает куку.
 *
 * Автоматический выход по 401 (`lib/http-client/auth.ts`, `handleAuthFailure`) сюда не ходит:
 * он сессии на бэкенде не гасит.
 */
export async function signOutWithRevoke(callbackUrl: string): Promise<void> {
  await revokeBackendSessionsAction().catch(() => undefined);
  clearLoggedInMarker();
  await signOut({ callbackUrl });
}
