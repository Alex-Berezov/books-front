'use server';

import { headers } from 'next/headers';
import { getToken } from 'next-auth/jwt';
import { revokeBackendSessions } from '@/api/endpoints/auth-logout';
import { visitorIpHeaderFrom } from '@/lib/visitor-ip';

/**
 * Выход по кнопке гасит сессии пользователя на бэкенде (`LEGACY-451`, решение арбитра
 * 10.10.2026, `decisions-log.md`). Кнопка ждёт это действие и только потом зовёт `signOut()`.
 *
 * Почему серверное действие, а не `events.signOut` Auth.js: событие не знает, кто вызвал
 * выход. Автоматический выход по 401 (`handleAuthFailure`) гасил бы сессии на всех устройствах
 * при любом рассинхроне часов, а кнопка при временном отказе refresh — не гасила бы.
 * Автоматический выход к бэкенду не ходит вовсе.
 *
 * refresh читается из серверной JWT-куки и никуда не возвращается (`LEGACY-446`). Имя куки
 * зависит от схемы (`__Secure-` на https), поэтому пробуются обе формы — как `getToken`
 * в `middleware.ts`, только без адреса запроса под рукой. Отказ любого шага выход не роняет.
 */
export async function revokeBackendSessionsAction(): Promise<void> {
  try {
    const requestHeaders = headers();
    for (const secureCookie of [true, false]) {
      const token = await getToken({
        req: { headers: requestHeaders },
        secret: process.env.NEXTAUTH_SECRET,
        secureCookie,
      });
      if (token?.refreshToken) {
        await revokeBackendSessions(
          token.refreshToken,
          visitorIpHeaderFrom({ headers: requestHeaders })
        );
        return;
      }
    }
  } catch {
    console.error('Backend logout skipped: session cookie unreadable');
  }
}
