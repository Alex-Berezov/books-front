/**
 * Authorization module for HTTP client
 *
 * Признак живой сессии в браузере и разбор отказа авторизации. Токена в браузере нет: его
 * добавляет серверный прокси `/api/backend` (`LEGACY-465`).
 */

import { getSession, signOut } from 'next-auth/react';
import { isSessionEndedError } from '@/lib/auth/constants';
import { clearLoggedInMarker } from '@/lib/auth/sessionMarker';
import { describeApiFailure } from '@/lib/errors';
import { API_ERROR_TYPE, HTTP_STATUS } from '@/lib/http.constants';
import { ApiError } from '@/types/api';
import type { Session } from 'next-auth';

// Cache settings to prevent excessive API calls
/** Сколько браузер держит сессию без перезапроса; запас `ACCESS_TOKEN_SKEW_MS` обязан быть больше (`LEGACY-451`). */
export const SESSION_CACHE_TIME = 60 * 1000; // 1 minute

// Cache state
let cachedSession: Session | null = null;
let lastSessionFetchTime = 0;
/**
 * Отличает «сессию ещё не спрашивали» от «спросили — сессии нет» (`LEGACY-267`).
 * Кэш ниже раньше проверялся истинностью `cachedSession`, а она у анонима всегда
 * `null` — то есть кэш отрицательного ответа не срабатывал никогда, и каждый вызов
 * уходил в `getSession()` заново.
 */
let sessionKnown = false;
let sessionFetchPromise: Promise<Session | null> | null = null;

const applySession = (session: Session | null) => {
  cachedSession = session;
  lastSessionFetchTime = Date.now();
  sessionKnown = true;
};

/**
 * Manually set session (e.g. from AppProviders)
 * to avoid initial network request
 */
export const setSession = (session: Session | null) => {
  applySession(session);
};

/**
 * Get current session
 *
 * @param maxAgeMs - Сколько держать полученную сессию без перезапроса (по умолчанию —
 *   `SESSION_CACHE_TIME`)
 * @returns User session or null
 */
export const getCurrentSession = async (maxAgeMs: number = SESSION_CACHE_TIME) => {
  // Client-side only
  if (typeof window === 'undefined') {
    return null;
  }

  const now = Date.now();

  // Return cached session (including a cached "no session") if still valid
  if (sessionKnown && now - lastSessionFetchTime < maxAgeMs) {
    return cachedSession;
  }

  // Return existing promise if request in progress
  if (sessionFetchPromise) {
    return sessionFetchPromise;
  }

  try {
    sessionFetchPromise = getSession();
    const session = await sessionFetchPromise;

    applySession(session);

    return session;
  } catch (error) {
    console.error('Failed to get session:', error);
    return null;
  } finally {
    sessionFetchPromise = null;
  }
};

/**
 * Окно, в котором только что полученная сессия считается свежей, мс. Несколько запросов страницы
 * получают 401 почти разом: первый спрашивает `/api/auth/session`, остальные берут его ответ.
 */
const FRESH_SESSION_WINDOW_MS = 5 * 1000;

/**
 * Свежая сессия — для повтора после 401 на маршруте серверного прокси (`LEGACY-465`).
 *
 * Прокси токен не продлевает и кук не пишет (решение арбитра 12.10.2026): продление идёт только
 * через `/api/auth/session`, его и зовёт `getSession()`. Кэш здесь — окно свежести в 5 с вместо
 * минуты: идущий уже запрос сессии не дублируется, а ответ, полученный только что, раздаётся
 * остальным запросам страницы без нового запроса.
 */
export const refreshCurrentSession = (): Promise<Session | null> =>
  getCurrentSession(FRESH_SESSION_WINDOW_MS);

/**
 * Текст ошибки авторизованного клиента, вызванного с сервера.
 *
 * Вынесен в константу, потому что на него смотрит посадка: общий 401 от этого
 * места неотличим от честного ответа бэкенда неавторизованному запросу
 * (`LEGACY-140`).
 */
export const SERVER_CONTEXT_AUTH_MESSAGE =
  'Authorized HTTP client called from a server context: this client reads the NextAuth session ' +
  'through the browser-only path, and the browser session carries no access token (LEGACY-465). ' +
  'On the server the token lives in the encrypted session cookie — read it with ' +
  'getServerAccessToken() from lib/auth/session-utils.ts (the same reader the server proxy uses) ' +
  'and pass it explicitly as accessToken; call the endpoint with requireAuth: false / optionalAuth: true only when the ' +
  'route is genuinely open to anonymous callers.';

/** Код этой ошибки: она про неверный вызов, а не про неавторизованного посетителя. */
export const SERVER_CONTEXT_AUTH_ERROR = 'ServerContextAuthUnavailable';

/**
 * Сессия пригодна для запроса от имени пользователя: она есть и не окончена окончательно.
 *
 * Признак http-клиента (`LEGACY-465`, заход 2): выбор маршрута и отказ до сети; повтор после 401
 * дополнительно требует сессии без `error` (`withAuthRetry`). Интерфейс решает строже — по любому
 * `error` (`lib/reading-progress/useProgressTarget.ts`): при временном отказе пишет локально. Временный отказ продления (`REFRESH_TOKEN_ERROR` с паузой) сессию не убивает — она
 * может ожить, и запрос через прокси уходит с прежним токеном, как раньше уходил из браузера.
 * Окончательный отказ (`isSessionEndedError`: истёк срок, выход на другом устройстве,
 * блокировка, неудавшийся соцвход) — сессии нет (`LEGACY-466`).
 */
export const isLiveSession = (session: Session | null | undefined): session is Session =>
  Boolean(session) && !isSessionEndedError(session?.error);

/**
 * Отказ до сети, если запрос от имени пользователя сделать нельзя.
 *
 * @throws ApiError 500 `ServerContextAuthUnavailable` — вызов с сервера (`LEGACY-140`)
 * @throws ApiError 401 — нет живой сессии
 */
export const requireLiveSession = async (): Promise<void> => {
  // ⚠️ На сервере `getCurrentSession` всегда возвращает null, поэтому дальше по
  // коду получался бы 401 ещё до похода в сеть — и выглядел бы как отказ
  // бэкенда. В карте сайта такой 401 оседал в noteFailure и превращался в 503
  // или в пропавшую секцию, а искать шли в бэкенд. Ошибка здесь называет
  // причину вслух: серверная функция названа так же, как рабочая клиентская,
  // и на ревью подмена контекста не видна (`LEGACY-140`).
  if (typeof window === 'undefined') {
    throw new ApiError({
      message: SERVER_CONTEXT_AUTH_MESSAGE,
      statusCode: 500,
      error: SERVER_CONTEXT_AUTH_ERROR,
    });
  }

  if (!isLiveSession(await getCurrentSession())) {
    throw new ApiError({
      message: describeApiFailure(HTTP_STATUS.UNAUTHORIZED, API_ERROR_TYPE.UNAUTHORIZED),
      statusCode: HTTP_STATUS.UNAUTHORIZED,
      error: API_ERROR_TYPE.UNAUTHORIZED,
    });
  }
};

/**
 * Есть ли сессия, токен которой API примет, — для ручки, открытой анониму, но отдающей личную
 * часть вошедшему (читалка, `LEGACY-088`). Строже `isLiveSession`: при любом `error`, включая
 * временный отказ продления, в куке протухший токен, и `OptionalJwtAuthGuard` ответил бы 401
 * вместо текста книги. Тогда запрос идёт анонимно: аноним получает тот же ответ без личной части.
 * На сервере — всегда `false`.
 */
export const hasUsableSession = async (): Promise<boolean> => {
  const session = await getCurrentSession();
  return isLiveSession(session) && !session.error;
};

/**
 * Perform logout on authentication failure
 */
export const handleAuthFailure = async (): Promise<void> => {
  if (typeof window !== 'undefined') {
    clearLoggedInMarker();
    await signOut({ redirect: true, callbackUrl: '/en/auth/sign-in' });
  }
};
