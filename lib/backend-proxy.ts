/**
 * Проверки серверного прокси авторизованных запросов (`LEGACY-465`, пачка `T127`).
 *
 * Чистые функции без обращения к сети и к сессии: маршрут
 * `app/api/backend/[...path]/route.ts` зовёт их по очереди и отвечает отказом на первой
 * несработавшей. Вынесены отдельно, чтобы каждую границу держал юнит, а не только e2e.
 */

import {
  BACKEND_PROXY_HEADER,
  BACKEND_PROXY_HEADER_VALUE,
  BACKEND_PROXY_MAX_BODY_BYTES,
  BACKEND_PROXY_PREFIX,
} from './backend-proxy.constants';
import { HEADER_VALUE, HTTP_HEADER, HTTP_STATUS } from './http.constants';

interface HeaderCarrier {
  get: (name: string) => string | null;
}

/** Отказ прокси: код ответа и текст для тела `{statusCode, message, error}`. */
export interface ProxyRefusal {
  status: (typeof HTTP_STATUS)[
    | 'BAD_REQUEST'
    | 'UNAUTHORIZED'
    | 'FORBIDDEN'
    | 'PAYLOAD_TOO_LARGE'
    | 'UNSUPPORTED_MEDIA_TYPE'];
  message: string;
}

const PATH_REFUSAL: ProxyRefusal = {
  status: HTTP_STATUS.BAD_REQUEST,
  message: 'Invalid backend path',
};

const CROSS_SITE: ProxyRefusal = { status: HTTP_STATUS.FORBIDDEN, message: 'Cross-site request' };

const UNSUPPORTED_BODY: ProxyRefusal = {
  status: HTTP_STATUS.UNSUPPORTED_MEDIA_TYPE,
  message: 'Only application/json bodies are proxied',
};

const BODY_TOO_LARGE: ProxyRefusal = {
  status: HTTP_STATUS.PAYLOAD_TOO_LARGE,
  message: 'Request body too large',
};

/**
 * Первый сегмент пути, который прокси не пропускает. Вход, регистрация и продление идут через
 * Auth.js на сервере, браузеру через прокси они не нужны; а прокси ставит `X-Visitor-IP`
 * из заголовков запроса, и через него лимитер подбора пароля был бы ещё одной дверью
 * (`LEGACY-064`).
 */
const UNPROXIED_ROOT = 'auth';

/**
 * Путь API из адреса запроса к прокси — **сырой**, с исходным кодированием.
 *
 * Берётся из `pathname`, а не из разобранных Next сегментов `[...path]`: сегменты приходят
 * уже декодированными, и обратная склейка меняла бы адрес (`%2F` внутри слага стал бы
 * разделителем). Отказ — на всём, что может увести запрос с API: точечные сегменты (в том
 * числе закодированные), обратная косая, пустой сегмент (`//host` — адрес другого хоста),
 * управляющие символы.
 *
 * @returns путь вида `/users/me` или отказ
 */
export const backendPathFrom = (pathname: string): string | ProxyRefusal => {
  if (!pathname.startsWith(`${BACKEND_PROXY_PREFIX}/`)) return PATH_REFUSAL;

  const path = pathname.slice(BACKEND_PROXY_PREFIX.length);
  const segments = path.slice(1).split('/');

  for (const raw of segments) {
    let segment: string;
    try {
      segment = decodeURIComponent(raw);
    } catch {
      return PATH_REFUSAL;
    }
    if (segment === '' || segment === '.' || segment === '..') return PATH_REFUSAL;
    // eslint-disable-next-line no-control-regex -- управляющие символы в пути API — признак подмены
    if (/[\\/\u0000-\u001f\u007f]/.test(segment)) return PATH_REFUSAL;
  }

  if (decodeURIComponent(segments[0] ?? '').toLowerCase() === UNPROXIED_ROOT) {
    return { status: HTTP_STATUS.FORBIDDEN, message: 'Auth routes are not proxied' };
  }

  return path;
};

/**
 * Адрес в API для пути и строки запроса. Итог сверяется с базой: тот же origin и путь
 * внутри базового — вторая линия на случай, если разбор выше что-то пропустил.
 */
export const upstreamUrlFor = (
  apiBaseUrl: string,
  backendPath: string,
  search: string
): URL | ProxyRefusal => {
  const base = new URL(apiBaseUrl);
  const basePath = base.pathname.replace(/\/+$/, '');
  const url = new URL(`${base.origin}${basePath}${backendPath}${search}`);

  if (url.origin !== base.origin || !url.pathname.startsWith(`${basePath}/`)) {
    return PATH_REFUSAL;
  }
  return url;
};

/**
 * Запрос пришёл со своей же страницы.
 *
 * Свой заголовок обязателен всегда: простой межсайтовый запрос его не поставит. Дальше —
 * `Sec-Fetch-Site`, если браузер его прислал (все современные шлют): только `same-origin`,
 * и этого достаточно. У браузера без `Sec-Fetch-Site` присланный `Origin` сверяется целиком
 * (схема, хост, порт) с origin публичного адреса сайта из настроек (`getSiteUrl()`), а не
 * с адресом запроса: в рабочем сервере Next тот собран из `HOSTNAME:PORT` процесса
 * (`0.0.0.0:3000`), а не из адреса, который открыл посетитель (решение арбитра 12.10.2026,
 * `LEGACY-465`). `Origin: null` и пустой — отказ. Отсутствующий `Origin` пропускается: так шлёт
 * свой же GET старый браузер, а межсайтовый запрос со своим заголовком упирается в preflight.
 */
export const checkProxyOrigin = (
  headers: HeaderCarrier,
  siteOrigin: string
): ProxyRefusal | null => {
  if (headers.get(BACKEND_PROXY_HEADER) !== BACKEND_PROXY_HEADER_VALUE) {
    return { status: HTTP_STATUS.FORBIDDEN, message: 'Missing proxy header' };
  }

  const fetchSite = headers.get('sec-fetch-site');
  if (fetchSite !== null) {
    return fetchSite === 'same-origin' ? null : CROSS_SITE;
  }

  const origin = headers.get('origin');
  if (origin !== null) {
    let parsed: string;
    try {
      parsed = new URL(origin).origin;
    } catch {
      return CROSS_SITE;
    }
    if (parsed !== siteOrigin) {
      return CROSS_SITE;
    }
  }

  return null;
};

/**
 * Имя куки сессии с префиксом `__Secure-` или без — так же, как его выбирает Auth.js без
 * `AUTH_URL`: по схеме из `x-forwarded-proto` (`@auth/core/lib/utils/env.js`; Next ставит заголовок
 * сам, если его нет). Без заголовка — по протоколу публичного адреса сайта. Пока задан `AUTH_URL`,
 * Auth.js решает по нему — на проде это тот же https (решения арбитра 12.10.2026, `LEGACY-465`).
 * Заголовок только выбирает имя: подменивший его клиент не найдёт свою же куку, а чужую форму
 * имени сервер не примет — обе формы не пробуются.
 */
export const sessionCookieIsSecure = (forwardedProto: string | null, site: URL): boolean => {
  const proto = forwardedProto?.split(',')[0]?.trim().toLowerCase();
  return proto ? proto === 'https' : site.protocol === 'https:';
};

/**
 * Тип тела. Через прокси идёт только JSON: загрузки (multipart, octet-stream) ходят своими
 * путями и через прокси не пропускаются — потолок тела и буферизация рассчитаны на JSON.
 * Без типа допустимо только пустое тело: маршрут зовёт проверку до чтения (`hasBody` ложно —
 * отказ по объявленному типу) и после (`hasBody` истинно — тело без типа).
 */
export const checkProxyContentType = (
  headers: HeaderCarrier,
  hasBody = false
): ProxyRefusal | null => {
  const contentType = headers.get(HTTP_HEADER.CONTENT_TYPE);
  if (contentType === null) return hasBody ? UNSUPPORTED_BODY : null;

  const mediaType = contentType.split(';')[0]?.trim().toLowerCase();
  if (mediaType === HEADER_VALUE.JSON) return null;

  return UNSUPPORTED_BODY;
};

/** Заявленная длина тела больше потолка — отказ до чтения. */
export const checkDeclaredLength = (headers: HeaderCarrier): ProxyRefusal | null => {
  const declared = Number(headers.get('content-length'));
  if (Number.isFinite(declared) && declared > BACKEND_PROXY_MAX_BODY_BYTES) {
    return BODY_TOO_LARGE;
  }
  return null;
};

/**
 * Тело запроса целиком, но не больше потолка. Длина в заголовке может отсутствовать
 * (chunked) или лгать, поэтому счёт идёт по прочитанным байтам, а чтение обрывается
 * на первом куске сверх потолка.
 */
export const readLimitedBody = async (
  body: ReadableStream<Uint8Array> | null
): Promise<Uint8Array<ArrayBuffer> | ProxyRefusal | null> => {
  if (!body) return null;

  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > BACKEND_PROXY_MAX_BODY_BYTES) {
      await reader.cancel().catch(() => undefined);
      return BODY_TOO_LARGE;
    }
    chunks.push(value);
  }

  if (total === 0) return null;

  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return merged;
};

/**
 * Заголовки ответа API, которые доходят до браузера. Белый список, а не чёрный: всё,
 * что выставил API (`Set-Cookie`, CORS, служебные), остаётся на сервере.
 *
 * `date` и `age` читает поправка часов (`lib/http.ts`, `recordClockSkew`), `retry-after` —
 * разбор 429, `content-disposition` — имя скачиваемого файла.
 */
export const FORWARDED_RESPONSE_HEADERS: readonly string[] = [
  'content-type',
  'date',
  'age',
  'retry-after',
  'content-disposition',
  'content-language',
];

export const isProxyRefusal = (value: unknown): value is ProxyRefusal =>
  typeof value === 'object' &&
  value !== null &&
  'status' in value &&
  'message' in value &&
  !(value instanceof URL) &&
  !(value instanceof Uint8Array);
