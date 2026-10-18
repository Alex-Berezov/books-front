/**
 * Серверный прокси авторизованных запросов браузера (`LEGACY-465`, пачка `T127`).
 *
 * Браузер ходит в API не напрямую с `Authorization: Bearer`, а на свой же домен:
 * `/api/backend/<путь API>`. Токен к запросу добавляет сервер Next из сессии
 * (`app/api/backend/[...path]/route.ts`). Общие для клиента и маршрута значения
 * лежат здесь, потому что их импортирует и клиентский бандл.
 */

/** Префикс маршрута прокси: `/api/backend/users/me` уходит в `${API_BASE_URL}/users/me`. */
export const BACKEND_PROXY_PREFIX = '/api/backend';

/**
 * Обязательный заголовок запроса к прокси.
 *
 * Защита от CSRF: простой межсайтовый запрос (форма, `<img>`, `fetch` без своих
 * заголовков) этот заголовок поставить не может, а `fetch` с ним с чужого сайта
 * упирается в preflight, на который прокси не отвечает разрешением.
 */
export const BACKEND_PROXY_HEADER = 'X-Bibliaris-Proxy';

/** Значение заголовка. Проверяется точным совпадением. */
export const BACKEND_PROXY_HEADER_VALUE = '1';

/**
 * Потолок тела запроса, байт. Совпадает с JSON-лимитом бэкенда (`BODY_LIMIT_JSON`,
 * по умолчанию `1mb` в `books/src/common/security/app-security.config.ts`):
 * больше бэкенд всё равно не примет, а прокси не должен держать в памяти тело,
 * которое заведомо получит отказ.
 */
export const BACKEND_PROXY_MAX_BODY_BYTES = 1024 * 1024;

/**
 * Сколько прокси ждёт ответа API (заголовков), мс. Меньше потолка Cloudflare (100 с) на плече
 * «браузер → сайт»: иначе Cloudflare успевал бы отдать браузеру свою HTML-страницу 524 раньше,
 * чем прокси — понятный JSON 504.
 */
export const BACKEND_PROXY_UPSTREAM_TIMEOUT_MS = 90_000;

/**
 * Заголовок страны посетителя для API и значение «страна неизвестна» (`LEGACY-465`). Лежат здесь,
 * а не в `backend-proxy.ts`: их импортирует и серверная выборка `getPublicBookAnalysis`
 * (`api/endpoints/public.ts`), чей модуль тянет клиентский бандл (F03-2).
 */
export const VISITOR_COUNTRY_HEADER = 'X-Visitor-Country';

export const UNKNOWN_COUNTRY = 'XX';
