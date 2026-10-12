/**
 * Constants for authorization module
 *
 * Contains all numeric values, token lifetimes,
 * error types and other constants related to authorization.
 */

/**
 * Token expiration times
 */
export const AUTH_TOKEN_EXPIRY = {
  /** Access token is valid for 12 hours (in milliseconds) */
  ACCESS_TOKEN_MS: 12 * 60 * 60 * 1000,

  /** Refresh token is valid for 7 days (in seconds for NextAuth session) */
  REFRESH_TOKEN_SECONDS: 7 * 24 * 60 * 60,

  /**
   * Запас до `exp` access, мс: обновление начинается раньше, чем бэкенд скажет 401 —
   * на рассинхрон часов сервера Next и бэкенда и на запрос в пути (`LEGACY-451`, `T122`).
   *
   * ⚠️ Больше кэша сессии в браузере (`SESSION_CACHE_TIME` = 60 с, `lib/http-client/auth.ts`):
   * иначе браузер держит токен, который сервер уже обновил бы, и повтор `withAuthRetry`
   * берёт ту же закэшированную сессию — второй 401 и выход.
   */
  ACCESS_TOKEN_SKEW_MS: 90 * 1000,
} as const;

/** Таймауты запросов авторизации к бэкенду, мс. */
export const AUTH_REQUEST_TIMEOUTS = {
  /** `POST /auth/logout`: повисший бэкенд не держит человека «вошедшим». */
  LOGOUT_MS: 3 * 1000,

  /**
   * `POST /auth/refresh`: обновление одного refresh-токена ждут все параллельные вызовы колбэка
   * `jwt` (`sharedRefresh`, `LEGACY-465`), и повисший запрос держал бы их до таймаута undici
   * (~300 с). Обрыв — временный отказ с паузой `REFRESH_RETRY_PAUSE_MS`.
   */
  REFRESH_MS: 10 * 1000,

  /**
   * Сколько исход продления раздаётся повторным вызовам с тем же refresh-токеном после ответа
   * (`sharedRefresh`, `LEGACY-465`). Пока запрос в пути, его и так ждут все — окно отсчитывается
   * от ответа и с `REFRESH_MS` не связано. Шире не делать: погашенная за окно сессия (выход,
   * блокировка) получает уже отозванные токены вместо своего отказа.
   */
  REFRESH_SHARE_MS: 10 * 1000,

  /**
   * Пауза после временного отказа `/auth/refresh` (429, 5xx, сеть), мс: следующий вызов колбэка
   * `jwt` повторит обновление не раньше неё. Окончательный отказ (400, 401) не повторяется вовсе
   * (решение арбитра 10.10.2026, `LEGACY-451`).
   */
  REFRESH_RETRY_PAUSE_MS: 60 * 1000,
} as const;

/** Ответы `/auth/refresh`, после которых повторять обновление бессмысленно (`LEGACY-451`). */
export const FINAL_REFRESH_STATUSES: ReadonlySet<number> = new Set([400, 401]);

/**
 * `refreshRetryAt` окончательного отказа — «никогда». Число, а не `Infinity`: токен уходит в куку
 * через JSON, где `Infinity` превращается в `null`. Отличает окончательный отказ от куки до
 * `T122`, у которой отметки нет вовсе.
 */
export const REFRESH_RETRY_NEVER = Number.MAX_SAFE_INTEGER;

/**
 * Session polling optimization settings
 */
export const SESSION_SETTINGS = {
  /** Check session every 15 minutes instead of default 60 seconds */
  REFETCH_INTERVAL_MINUTES: 15,

  /** Update session token every 4 hours to balance security and performance */
  UPDATE_AGE_HOURS: 4,
} as const;

/**
 * Authorization error types
 */
export enum AuthErrorType {
  /** Error refreshing token */
  REFRESH_TOKEN_ERROR = 'RefreshAccessTokenError',

  /** Invalid credentials */
  INVALID_CREDENTIALS = 'InvalidCredentials',

  /** Rate limit exceeded */
  RATE_LIMIT_EXCEEDED = 'RateLimitExceeded',

  /** Email and password are required */
  MISSING_CREDENTIALS = 'MissingCredentials',

  /** Backend refused the login for a reason of its own */
  AUTHENTICATION_FAILED = 'AuthenticationFailed',

  /** Сессия окончена бэкендом окончательно (refresh вернул 400/401): повторять нечего (`LEGACY-466`). */
  SESSION_ENDED = 'SessionEnded',

  /** Аккаунт заблокирован: бэкенд ответил 401 с кодом `ACCOUNT_DISABLED` (`LEGACY-452`, `LEGACY-466`). */
  ACCOUNT_DISABLED = 'AccountDisabled',
}

/** Машинный признак блокировки в теле 401 бэкенда (`books/src/modules/auth/auth.service.ts`). */
export const ACCOUNT_DISABLED_API_CODE = 'ACCOUNT_DISABLED';

/**
 * Ошибки сессии, после которых она мертва и ждёт выхода: окончательный отказ refresh, блокировка
 * и отказ бэкенда на соцвходе (токенов у такой сессии нет вовсе). Временный отказ refresh
 * (`REFRESH_TOKEN_ERROR` с паузой) сюда не входит: он повторяется, и сессия может ожить
 * (`LEGACY-451`, `LEGACY-466`). Он же — белый список причин `?reason=` на странице входа.
 */
const SESSION_END_ERRORS: ReadonlySet<string> = new Set<string>([
  AuthErrorType.SESSION_ENDED,
  AuthErrorType.ACCOUNT_DISABLED,
  AuthErrorType.INVALID_CREDENTIALS,
  AuthErrorType.AUTHENTICATION_FAILED,
]);

export const isSessionEndedError = (error: unknown): error is AuthErrorType =>
  typeof error === 'string' && SESSION_END_ERRORS.has(error);

/**
 * То же по сырому токену из куки (middleware читает её без колбэка `jwt`): кука до `T129` хранила
 * окончательный отказ как `REFRESH_TOKEN_ERROR` с отметкой «никогда» (`LEGACY-466`).
 */
export const isTokenSessionEnded = (token: {
  error?: unknown;
  refreshRetryAt?: unknown;
}): boolean =>
  isSessionEndedError(token.error) ||
  (token.error === AuthErrorType.REFRESH_TOKEN_ERROR &&
    token.refreshRetryAt === REFRESH_RETRY_NEVER);

/** Параметр страницы входа с причиной принудительного выхода (`/sign-in?reason=…`). */
export const SIGN_IN_REASON_PARAM = 'reason';

/** Ключ словаря причины выхода или `null`: параметр приходит из адресной строки. */
export const sessionEndReasonDictKey = (reason: string | null | undefined): string | null =>
  isSessionEndedError(reason) ? AUTH_ERROR_DICT_KEY[reason] : null;

/**
 * Ключ словаря на каждый код отказа входа (`LEGACY-053`).
 *
 * 🔴 До 06.09.2026 рядом лежала карта `AUTH_ERROR_MESSAGES` с английскими фразами,
 * и `authorize` кидал именно фразу, а страница входа сравнивала её со строкой.
 * Константа выполняла двойную роль — код и текст для пользователя, — то есть любое
 * место, отрендерившее `error.message`, показывало русскому читателю английский текст.
 * Теперь наружу уходит **код** (полем `code`, см. `authErrorDictKey`), а текст
 * живёт только в словарях.
 *
 * Код, которого здесь нет (и `REFRESH_TOKEN_ERROR`, у которого своего экрана нет),
 * сводится к общему `auth.signin.genericError` — см. `AUTH_ERROR_FALLBACK_KEY`.
 */
export const AUTH_ERROR_DICT_KEY: Record<AuthErrorType, string> = {
  [AuthErrorType.INVALID_CREDENTIALS]: 'auth.signin.invalidCredentials',
  [AuthErrorType.RATE_LIMIT_EXCEEDED]: 'auth.signin.rateLimit',
  [AuthErrorType.MISSING_CREDENTIALS]: 'auth.signin.missingCredentials',
  [AuthErrorType.REFRESH_TOKEN_ERROR]: 'auth.signin.genericError',
  [AuthErrorType.AUTHENTICATION_FAILED]: 'auth.signin.genericError',
  [AuthErrorType.SESSION_ENDED]: 'auth.signin.sessionEnded',
  [AuthErrorType.ACCOUNT_DISABLED]: 'auth.signin.accountDisabled',
};

/** Ключ словаря для отказа, код которого не опознан. */
export const AUTH_ERROR_FALLBACK_KEY = 'auth.signin.genericError';

/**
 * Ключ словаря по коду, который вернул `signIn`.
 *
 * ⚠️ 🔴 Код доезжает до клиента **только** в поле `result.code` и **только** если
 * `authorize` бросил наследника `CredentialsSignin`: обычный `Error` `@auth/core`
 * заворачивает в `CallbackRouteError`, тот не входит в белый список клиентски
 * безопасных типов, и наружу уходит `error=Configuration` — то есть код теряется,
 * а посетитель получает общий текст на любую причину. Отсюда `SignInCodeError`
 * в `lib/auth/config.ts`; читать надо `result.code`, а не `result.error`.
 *
 * Поиск идёт по собственным ключам: значение приходит из адресной строки, и
 * `AUTH_ERROR_DICT_KEY['toString']` вернул бы функцию прототипа, а она уронила бы `t()`.
 */
export const authErrorDictKey = (code: string | null | undefined): string =>
  (code && Object.prototype.hasOwnProperty.call(AUTH_ERROR_DICT_KEY, code)
    ? AUTH_ERROR_DICT_KEY[code as AuthErrorType]
    : AUTH_ERROR_FALLBACK_KEY) || AUTH_ERROR_FALLBACK_KEY;

/**
 * User roles in the system
 */
export enum UserRole {
  /** Regular user */
  USER = 'user',

  /** Administrator */
  ADMIN = 'admin',

  /** Content manager */
  CONTENT_MANAGER = 'content_manager',

  /** Phase 19: lawyer — legal review workflow only */
  LAWYER = 'lawyer',
}

/**
 * Roles with access to the content part of the admin panel.
 *
 * Deliberately does NOT include `lawyer`: `isStaff()` and comment moderation are wired to this
 * list, and a lawyer must not gain either (ADR-004).
 */
export const STAFF_ROLES = [UserRole.ADMIN, UserRole.CONTENT_MANAGER] as const;

/**
 * Roles allowed into `/admin/*` at all. A lawyer gets in but sees only the legal sections —
 * the sidebar is filtered by role and every other rights endpoint answers 403.
 */
export const ADMIN_PANEL_ROLES = [...STAFF_ROLES, UserRole.LAWYER] as const;

/**
 * Authorization routes
 */
export const AUTH_ROUTES = {
  SIGN_IN: '/en/auth/sign-in',
  SIGN_OUT: '/en/auth/sign-out',
  ERROR: '/en/auth/error',
  REGISTER: '/en/auth/register',
} as const;
