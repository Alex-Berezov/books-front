/**
 * Серверный прокси авторизованных запросов браузера (`LEGACY-465`, пачка `T127`, заход 1 из 2).
 *
 * Браузер шлёт сюда JSON-запросы `http*Auth` без токена; токен добавляется здесь из JWT-куки
 * сессии Auth.js, и запрос уходит в API. Так `accessToken` перестаёт быть нужен браузерному коду
 * (снятие его из сессии — заход 2, решения арбитра 12.10.2026 в `decisions-log.md`).
 *
 * 🔴 Токен читается `getToken` — только чтение куки, без продления и без `Set-Cookie`. Ни
 * обёртки `auth(handler)`, ни `auth()` здесь нет намеренно: обёртка переиздаёт JWT-куку на каждом
 * ответе, и запрос, ещё летевший через прокси в момент выхода, вернул бы браузеру стёртую сессию
 * (решение арбитра 12.10.2026). Продление живёт в одном месте — `/api/auth/session`:
 * истёкший access даёт 401 от API, и клиент (`withAuthRetry`) берёт свежую сессию и повторяет.
 *
 * Порядок отказов: путь (400, `/auth/*` — 403) → источник (403) → объявленные тип (415) и длина
 * (413) → сессия (401) → прочитанное тело (413, 415). Всё до похода в API, тело — только с сессией.
 */

import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { isTokenSessionEnded } from '@/lib/auth/constants';
import {
  FORWARDED_RESPONSE_HEADERS,
  sessionCookieIsSecure,
  backendPathFrom,
  checkDeclaredLength,
  checkProxyContentType,
  checkProxyOrigin,
  isProxyRefusal,
  readLimitedBody,
  upstreamUrlFor,
} from '@/lib/backend-proxy';
import { BACKEND_PROXY_UPSTREAM_TIMEOUT_MS } from '@/lib/backend-proxy.constants';
import {
  API_BASE_URL,
  AUTH_PREFIX,
  HEADER_VALUE,
  HTTP_HEADER,
  HTTP_METHOD,
  HTTP_STATUS,
} from '@/lib/http.constants';
import { getSiteUrl } from '@/lib/seo/urls';
import { visitorIpHeaderFrom } from '@/lib/visitor-ip';
import type { ProxyRefusal } from '@/lib/backend-proxy';
import type { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

/** Ответ прокси личный и не кэшируется нигде: домен сайта стоит за Cloudflare. */
const NO_STORE = 'private, no-store';

const refuse = ({ status, message }: ProxyRefusal): NextResponse =>
  NextResponse.json(
    { statusCode: status, message, error: 'BackendProxyRefused' },
    { status, headers: { 'Cache-Control': NO_STORE } }
  );

const badGateway = (status: number, message: string): NextResponse =>
  NextResponse.json(
    { statusCode: status, message, error: 'BackendProxyUpstream' },
    { status, headers: { 'Cache-Control': NO_STORE } }
  );

/**
 * Статусы, у которых не бывает тела: `new Response(тело, { status })` на них бросает
 * `TypeError`, и успешный на бэкенде запрос стал бы 500 прокси.
 */
const NULL_BODY_STATUSES = new Set([101, 204, 205, 304]);

/** Код nginx «клиент закрыл запрос»: ответ на отменённый браузером запрос никто не прочтёт. */
const CLIENT_CLOSED_REQUEST = 499;

const METHODS_WITH_BODY = new Set<string>([
  HTTP_METHOD.POST,
  HTTP_METHOD.PATCH,
  HTTP_METHOD.PUT,
  HTTP_METHOD.DELETE,
]);

/**
 * Отказ без сессии. Клиент сюда без сессии не ходит (`resolveAuthRoute`: аноним идёт в API
 * напрямую), поэтому запрос без куки — не наш браузер: прокси не ретранслирует его вовсе,
 * в том числе с `X-Visitor-IP` (`LEGACY-064`). Окончательно оконченная сессия — то же самое:
 * её токен бэкенд не примет (`LEGACY-466`).
 */
const NO_SESSION: ProxyRefusal = { status: HTTP_STATUS.UNAUTHORIZED, message: 'No live session' };

const handler = async (req: NextRequest): Promise<Response> => {
  const backendPath = backendPathFrom(req.nextUrl.pathname);
  if (isProxyRefusal(backendPath)) return refuse(backendPath);

  const upstreamUrl = upstreamUrlFor(API_BASE_URL, backendPath, req.nextUrl.search);
  if (isProxyRefusal(upstreamUrl)) return refuse(upstreamUrl);

  // Публичный адрес сайта из настроек, а не адрес запроса: тот в рабочем сервере Next собран
  // из `HOSTNAME:PORT` процесса (решение арбитра 12.10.2026).
  const site = new URL(getSiteUrl());

  const originRefusal = checkProxyOrigin(req.headers, site.origin);
  if (originRefusal) return refuse(originRefusal);

  const hasBody = METHODS_WITH_BODY.has(req.method);
  if (hasBody) {
    const typeRefusal = checkProxyContentType(req.headers) ?? checkDeclaredLength(req.headers);
    if (typeRefusal) return refuse(typeRefusal);
  }

  let accessToken: string;
  let body: Uint8Array<ArrayBuffer> | null = null;
  try {
    // Сессия — до чтения тела: тело до 1 МБ в памяти — единственная дорогая работа, и запрос
    // без учётки её не получает (решение арбитра 12.10.2026).
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
      secureCookie: sessionCookieIsSecure(req.headers.get('x-forwarded-proto'), site),
    });
    // Без access токен в API не уходит: запрос от имени вошедшего пользователя без токена
    // получил бы ответ анонима, а не 401.
    if (!token?.accessToken || isTokenSessionEnded(token)) return refuse(NO_SESSION);
    accessToken = token.accessToken;

    if (hasBody) {
      // Потолок — по прочитанным байтам: длины может не быть (chunked), или она лжёт.
      const read = await readLimitedBody(req.body);
      if (isProxyRefusal(read)) return refuse(read);
      const untyped = checkProxyContentType(req.headers, read !== null);
      if (untyped) return refuse(untyped);
      body = read;
    }
  } catch (error) {
    // Браузер оборвал загрузку тела — отвечать некому.
    if (req.signal.aborted) return new Response(null, { status: CLIENT_CLOSED_REQUEST });
    // Нечитаемая кука или нет секрета (`MissingSecret`) — сбой самого фронта, а не API. Ответ
    // всё равно личный: без `no-store` его мог бы закэшировать кто-то по дороге.
    console.error(
      'Backend proxy: request handling failed',
      error instanceof Error ? `${error.name}: ${error.message}` : String(error)
    );
    return NextResponse.json(
      {
        statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
        message: 'Proxy failed',
        error: 'BackendProxyFailed',
      },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR, headers: { 'Cache-Control': NO_STORE } }
    );
  }

  // Белый список, а не пересылка всех заголовков: куки фронта и присланный браузером
  // `Authorization` в API не уходят. Других заголовков вызывающие `http*Auth` сегодня не ставят.
  const headers = new Headers(visitorIpHeaderFrom(req));
  headers.set(HTTP_HEADER.AUTHORIZATION, `${AUTH_PREFIX.BEARER} ${accessToken}`);
  const language = req.headers.get(HTTP_HEADER.ACCEPT_LANGUAGE);
  if (language) headers.set(HTTP_HEADER.ACCEPT_LANGUAGE, language);
  const accept = req.headers.get('accept');
  if (accept) headers.set('Accept', accept);
  if (body) {
    headers.set(
      HTTP_HEADER.CONTENT_TYPE,
      req.headers.get(HTTP_HEADER.CONTENT_TYPE) ?? HEADER_VALUE.JSON
    );
  }

  // Таймаут — только на ожидание ответа API (заголовков): длинный ответ, который уже идёт
  // потоком, обрывать нельзя — браузер получил бы обрезанный JSON.
  const timeout = new AbortController();
  const timer = setTimeout(
    () => timeout.abort(new DOMException('Backend timed out', 'TimeoutError')),
    BACKEND_PROXY_UPSTREAM_TIMEOUT_MS
  );

  let upstream: Response;
  try {
    upstream = await fetch(upstreamUrl, {
      method: req.method,
      headers,
      body: body ?? undefined,
      // Чужой хост по `Location` прокси не открывает: API на авторизованных ручках
      // не перенаправляет, а следовать редиректу с токеном — значит отдать его.
      redirect: 'manual',
      cache: 'no-store',
      signal: AbortSignal.any([req.signal, timeout.signal]),
    });
  } catch (error) {
    // Браузер сам отменил запрос (ушёл со страницы, react-query снял запрос): отвечать некому,
    // и сбоем API это не является.
    if (req.signal.aborted) return new Response(null, { status: CLIENT_CLOSED_REQUEST });
    if (
      timeout.signal.aborted ||
      (error instanceof DOMException && error.name === 'TimeoutError')
    ) {
      return badGateway(HTTP_STATUS.GATEWAY_TIMEOUT, 'Backend did not respond in time');
    }
    // Только имя и текст ошибки: адрес с токеном и тело запроса в лог не идут.
    console.error(
      'Backend proxy: upstream unreachable',
      error instanceof Error ? `${error.name}: ${error.message}` : String(error)
    );
    return badGateway(HTTP_STATUS.BAD_GATEWAY, 'Backend is unreachable');
  } finally {
    clearTimeout(timer);
  }

  const responseHeaders = new Headers({ 'Cache-Control': NO_STORE });
  for (const name of FORWARDED_RESPONSE_HEADERS) {
    const value = upstream.headers.get(name);
    if (value !== null) responseHeaders.set(name, value);
  }
  // Пустой ответ 200 клиент узнаёт по `content-length: 0` (`lib/http.ts`, `handleResponse`).
  // Остальные длины не пересылаются: `fetch` уже распаковал тело, и сжатая длина солгала бы.
  if (upstream.headers.get('content-length') === '0') responseHeaders.set('content-length', '0');

  return new Response(NULL_BODY_STATUSES.has(upstream.status) ? null : upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
};

export { handler as GET, handler as POST, handler as PATCH, handler as PUT, handler as DELETE };
