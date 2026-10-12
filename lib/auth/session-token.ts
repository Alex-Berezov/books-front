/**
 * Access-токен из зашифрованной JWT-куки сессии — на сервере, одним местом (`LEGACY-465`).
 *
 * Зовут серверный прокси `app/api/backend/[...path]/route.ts` и заготовка `getServerAccessToken`
 * (`lib/auth/session-utils.ts`). `getToken` только читает куку: без продления и без записи
 * (решение арбитра 12.10.2026, круг 2). Имя куки (`__Secure-` или без) выбирается так же, как
 * у Auth.js, — `sessionCookieIsSecure` (решения арбитра 12.10.2026, круги 3 и 4).
 */

import { getToken } from 'next-auth/jwt';
import { isTokenSessionEnded } from '@/lib/auth/constants';
import { FORWARDED_PROTO_HEADER, sessionCookieIsSecure } from '@/lib/backend-proxy';

/**
 * @param headers - заголовки входящего запроса (кука сессии и схема)
 * @param site - публичный адрес сайта (`getSiteUrl()`): по его протоколу имя куки, если схемы нет
 * @returns токен или `null` — куки нет, в ней нет access, или сессия окончена окончательно
 *   (`LEGACY-466`): её токен бэкенд не примет
 */
export const readSessionAccessToken = async (
  headers: Headers,
  site: URL
): Promise<string | null> => {
  const token = await getToken({
    req: { headers },
    secret: process.env.NEXTAUTH_SECRET,
    secureCookie: sessionCookieIsSecure(headers.get(FORWARDED_PROTO_HEADER), site),
  });
  if (!token?.accessToken || isTokenSessionEnded(token)) return null;
  return token.accessToken;
};
