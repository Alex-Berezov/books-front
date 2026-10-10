/**
 * NextAuth configuration for Bibliaris project
 *
 * Contains authorization settings via Credentials Provider,
 * callbacks for working with JWT and sessions, as well as refresh token handling.
 *
 * TODO (M1): Implement full authorization logic
 *
 * @see https://next-auth.js.org/configuration/options
 */

import { CredentialsSignin } from '@auth/core/errors';
import CredentialsProvider from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import { userDisplayName } from '@/lib/utils/user-name';
import { visitorIpHeaderFrom } from '@/lib/visitor-ip';
import type { AuthResponse } from '@/types/api-schema';
import type { User, Session, Account } from 'next-auth';
import type { JWT } from 'next-auth/jwt';
import {
  AUTH_REQUEST_TIMEOUTS,
  AUTH_TOKEN_EXPIRY,
  FINAL_REFRESH_STATUSES,
  REFRESH_RETRY_NEVER,
  SESSION_SETTINGS,
  AuthErrorType,
  AUTH_ROUTES,
} from './constants';

/**
 * Отказ входа, чей код доезжает до страницы входа.
 *
 * 🔴 Обычный `Error` до клиента не доходит: `@auth/core` заворачивает его
 * в `CallbackRouteError`, тот не входит в белый список клиентски безопасных типов,
 * и в адрес уходит `error=Configuration`. У наследника `CredentialsSignin` наружу
 * отдельным параметром уезжает `code` — единственное поле, которое переживает
 * дорогу (`@auth/core/index.js`, ветка `params.set('code', error.code)`).
 * Без этого класса карта `AUTH_ERROR_DICT_KEY` была бы мертва целиком (`LEGACY-053`).
 *
 * ⚠️ Импорт идёт из `@auth/core/errors`, а не из корня `next-auth`: корень тянет
 * `next/server`, который под vitest не разрешается, и от одного такого импорта
 * перестают запускаться все спеки, читающие `authOptions`. Копия `@auth/core`
 * в дереве одна, поэтому `instanceof` внутри библиотеки видит тот же класс.
 */
class SignInCodeError extends CredentialsSignin {
  constructor(code: AuthErrorType) {
    super(code);
    this.code = code;
  }
}

/**
 * JWT callback parameters
 */
interface JWTCallbackParams {
  token: JWT;
  user?: User;
  account?: Account | null;
  trigger?: 'signIn' | 'signUp' | 'update';
  isNewUser?: boolean;
  session?: Session;
}

/**
 * Session callback parameters
 */
interface SessionCallbackParams {
  session: Session;
  token: JWT;
  user?: User;
}

/**
 * Когда истекает access, мс: из `exp` самого токена, иначе — `ACCESS_TOKEN_MS` от «сейчас».
 *
 * 🔴 `LEGACY-451` (`T122`): бэкенд обрезает access до остатка жизни refresh — сессия больше
 * не продлевается, и под конец её срок access короче константы. Срок из константы держал бы
 * мёртвый access «живым» до 12 часов: первый же запрос получал 401 и выход посреди чтения.
 * Срок берётся с запасом `ACCESS_TOKEN_SKEW_MS`: без него в последние секунды жизни access
 * бэкенд уже отвечал бы 401, а колбэк `jwt` ещё отдавал бы старый токен.
 * Подпись здесь не проверяется и не нужна — это только расписание обновления, токен проверяет
 * бэкенд. Непрочитанный `exp` даёт прежнюю константу, а не 0 и не бесконечность (решение
 * арбитра 10.10.2026, `decisions-log.md`).
 */
export function accessTokenExpiresAt(accessToken: unknown): number {
  const now = Date.now();
  const fallback = now + AUTH_TOKEN_EXPIRY.ACCESS_TOKEN_MS;
  if (typeof accessToken !== 'string') return fallback;
  const segment = accessToken.split('.')[1];
  if (!segment) return fallback;
  try {
    const base64 = segment.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const claims: unknown = JSON.parse(atob(padded));
    const exp = (claims as { exp?: unknown } | null)?.exp;
    if (typeof exp !== 'number' || !Number.isFinite(exp)) return fallback;
    const withSkew = exp * 1000 - AUTH_TOKEN_EXPIRY.ACCESS_TOKEN_SKEW_MS;
    // Запас на часы и запрос в пути. Токен, живущий меньше запаса (последние секунды сессии:
    // бэкенд обрезает access до срока refresh), получает свой точный `exp`, а не «сейчас»:
    // иначе каждый вызов колбэка обновлял бы его по кругу до смерти refresh. Уже истёкший —
    // в прошлом, то есть одно обновление, отказ и остановка.
    return withSkew > now ? withSkew : exp * 1000;
  } catch {
    return fallback;
  }
}

/**
 * Refresh access token using refresh token
 *
 * Calls POST /auth/refresh to get a new pair of tokens
 *
 * @param token - current JWT token
 * @returns updated token or token with error
 */
export const refreshAccessToken = async (token: JWT): Promise<JWT> => {
  try {
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api';

    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Адреса посетителя здесь нет: обновление токена идёт из колбэка `jwt`,
        // которому Auth.js объект запроса не передаёт. Лимит на `/auth/refresh`
        // остаётся общим для сайта (10 в минуту). Терпимо, пока обновление идёт
        // раз на срок access, а отказ не повторяется: после 401 колбэк `jwt`
        // больше сюда не ходит (`LEGACY-451`, `T122`). Если это перестанет быть
        // правдой, адрес придётся класть в сам токен при входе (LEGACY-064).
      },
      body: JSON.stringify({
        refreshToken: token.refreshToken,
      }),
    });

    // If refresh failed - mark token with error
    if (!response.ok) {
      console.error('Failed to refresh token:', response.status);
      // 400/401 — сессия погашена или истекла, повторять бессмысленно. Остальное (429, 5xx,
      // 403 от WAF) временное: повтор после паузы (`LEGACY-451`, решение арбитра 10.10.2026).
      return FINAL_REFRESH_STATUSES.has(response.status)
        ? {
            ...token,
            error: AuthErrorType.REFRESH_TOKEN_ERROR,
            refreshRetryAt: REFRESH_RETRY_NEVER,
          }
        : retryLater(token);
    }

    const refreshedTokens = await response.json();

    // Return updated token
    return {
      ...token,
      accessToken: refreshedTokens.accessToken,
      refreshToken: refreshedTokens.refreshToken,
      accessTokenExpires: accessTokenExpiresAt(refreshedTokens.accessToken),
      error: undefined, // Reset error if it was set
      refreshRetryAt: undefined,
    };
  } catch (error) {
    console.error('Error refreshing access token:', error);
    // Обрыв сети или таймаут — временный отказ.
    return retryLater(token);
  }
};

/**
 * Временный отказ refresh: `error` **остаётся** — по нему читалка пишет прогресс локально, а не
 * шлёт запрос с истёкшим access (`lib/reading-progress/useProgressTarget.ts`), — и рядом
 * отметка, когда повторить. Без паузы повтор на каждом вызове колбэка выедал бы общий лимит
 * `/auth/refresh`; без повтора разовый сбой убивал бы сессию читателя навсегда и молча.
 *
 * ⚠️ Чего пауза не спасает: запрос под авторизацией в ней уходит с истёкшим access, бэкенд
 * отвечает 401, и http-клиент делает выход (`withAuthRetry` → `handleAuthFailure`), как и до
 * `T122`. Спасается тот, кто за паузу не сделал авторизованного запроса, — например, читатель.
 */
function retryLater(token: JWT): JWT {
  return {
    ...token,
    error: AuthErrorType.REFRESH_TOKEN_ERROR,
    refreshRetryAt: Date.now() + AUTH_REQUEST_TIMEOUTS.REFRESH_RETRY_PAUSE_MS,
  };
}

/**
 * Имя из токена старого формата: `undefined`, если поля `displayName` в токене нет
 * (токен нового формата). Старый токен без имени на сервере нёс `displayName: null` —
 * тогда, как и до перехода, показывается почта, а не имя профиля провайдера в `name`.
 */
function legacyDisplayName(token: JWT): string | undefined {
  if (!('displayName' in token)) return undefined;
  const value: unknown = token['displayName'];
  return typeof value === 'string' && value ? value : token.email;
}

/**
 * NextAuth configuration
 *
 * For next-auth v5 a simplified configuration object is used
 */
export const authOptions = {
  // Use JWT for sessions (not database)
  session: {
    strategy: 'jwt' as const,
    maxAge: AUTH_TOKEN_EXPIRY.REFRESH_TOKEN_SECONDS,
    // Update session every 4 hours (instead of default 1 day)
    updateAge: SESSION_SETTINGS.UPDATE_AGE_HOURS * 60 * 60, // Convert hours to seconds
  },

  // Authorization providers
  providers: [
    CredentialsProvider({
      id: 'credentials',
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'user@example.com' },
        password: { label: 'Password', type: 'password' },
      },
      /**
       * Authorize user via backend
       *
       * Calls POST /auth/login and returns user with tokens
       */
      async authorize(credentials, request) {
        // Validate required fields
        if (!credentials?.email || !credentials?.password) {
          throw new SignInCodeError(AuthErrorType.MISSING_CREDENTIALS);
        }

        const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api';

        try {
          const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              // Адрес посетителя берётся из объекта запроса, который фреймворк
              // передаёт вторым аргументом. Без него API видит все входы сайта с
              // одного адреса и отбивает шестую попытку за минуту — у всех сразу
              // (LEGACY-064). Именно этот путь и был критичным: вход выполняет
              // сервер, а не браузер.
              ...visitorIpHeaderFrom(request),
            },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          });

          // Handle errors
          if (!response.ok) {
            // Rate limiting
            if (response.status === 429) {
              throw new SignInCodeError(AuthErrorType.RATE_LIMIT_EXCEEDED);
            }

            // Invalid credentials
            if (response.status === 400 || response.status === 401) {
              throw new SignInCodeError(AuthErrorType.INVALID_CREDENTIALS);
            }

            // Other errors
            throw new SignInCodeError(AuthErrorType.AUTHENTICATION_FAILED);
          }

          const data = (await response.json()) as AuthResponse;

          // Return User object with tokens
          // Roles now come directly from backend in /auth/login
          return {
            id: data.user.id,
            email: data.user.email,
            name: userDisplayName(data.user),
            roles: data.user.roles || [],
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
          };
        } catch (error) {
          // Pass error further for UI handling
          if (error instanceof Error) {
            throw error;
          }
          throw new Error('Authentication failed');
        }
      },
    }),
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
    // Facebook is deliberately absent. It was configured but never finished, and
    // no button ever called it — yet registering the provider kept
    // /api/auth/signin/facebook reachable by URL. Facebook has no OIDC id_token
    // (only an access_token), so such a sign-in could not present the proof the
    // backend now requires and would have had to keep the unverified e-mail path
    // alive for it. The backend still verifies Facebook tokens
    // (SocialIdentityService), so bringing it back is: register the provider
    // here, send account.access_token, and set AUTH_FACEBOOK_ID/SECRET on the
    // API. See LEGACY-070 in books-app-docs/ai-context/legacy-warnings.md.
  ],

  // Callbacks for JWT and session handling
  callbacks: {
    /**
     * JWT Callback - token processing
     *
     * Saves tokens on login and automatically refreshes them on expiration
     */
    async jwt(params: JWTCallbackParams): Promise<JWT> {
      const { token, user, account } = params;

      // On first login - save tokens from authorize or sync via OAuth
      if (account && user) {
        if (account.provider === 'credentials') {
          return {
            ...token,
            id: user.id,
            email: user.email,
            name: user.name,
            roles: user.roles,
            accessToken: user.accessToken,
            refreshToken: user.refreshToken,
            accessTokenExpires: accessTokenExpiresAt(user.accessToken),
          };
        } else {
          // OAuth login. The backend is told *nothing* about who signed in —
          // it is handed the provider's own id_token and works the identity out
          // itself. Sending `email` used to be the whole story, which meant the
          // caller named the account and got a session for it (LEGACY-070).
          try {
            const API_BASE_URL =
              process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api';

            const idToken = account.id_token;
            if (!idToken) {
              // No proof, no session. Falling back to the e-mail here would
              // quietly restore the hole for whichever provider stopped
              // returning an id_token.
              console.error(
                `Social login: provider "${account.provider}" returned no id_token; refusing to sign in`
              );
              return { ...token, error: AuthErrorType.INVALID_CREDENTIALS };
            }

            const response = await fetch(`${API_BASE_URL}/auth/social`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                // Здесь тоже нет объекта запроса: колбэк `jwt` его не получает.
                // Вход через провайдера остаётся на общей корзине `auth:other`
                // (10 в минуту на сайт). Это заметно мягче, чем было у парольного
                // входа (5), и происходит один раз за сессию (LEGACY-064).
              },
              body: JSON.stringify({
                provider: account.provider,
                token: idToken,
              }),
            });

            if (!response.ok) {
              console.error('Failed to sync social login with backend:', response.status);
              return {
                ...token,
                error: AuthErrorType.INVALID_CREDENTIALS,
              };
            }

            const data = (await response.json()) as AuthResponse;

            return {
              ...token,
              id: data.user.id,
              email: data.user.email,
              name: userDisplayName(data.user),
              roles: data.user.roles || [],
              accessToken: data.accessToken,
              refreshToken: data.refreshToken,
              accessTokenExpires: accessTokenExpiresAt(data.accessToken),
            };
          } catch (error) {
            console.error('Error in social login JWT callback:', error);
            return {
              ...token,
              error: AuthErrorType.REFRESH_TOKEN_ERROR,
            };
          }
        }
      }

      // 🔴 После отказа refresh в `/auth/refresh` не ходим на каждом вызове колбэка (опрос
      // сессии, фокус вкладки, `auth()` в middleware): мёртвые сессии выедали бы общий лимит
      // (10 в минуту). Окончательный отказ не повторяется вовсе, временный — после паузы
      // `refreshRetryAt` (`LEGACY-451`, решения арбитра 10.10.2026).
      if (token.error === AuthErrorType.REFRESH_TOKEN_ERROR) {
        // Без `refreshRetryAt` — кука до `T122` (тогда временный отказ ставил одну `error`) или
        // ошибка первого входа через провайдера: один повтор, его исход и решит судьбу сессии.
        const retryDue = token.refreshRetryAt === undefined || Date.now() >= token.refreshRetryAt;
        if (!retryDue) return token;
        return refreshAccessToken(token);
      }

      // Срок сверяется и с `exp` самого access, а не только с сохранённым: у куки, выданной
      // до `T122`, сохранено «вход + 12 ч», а бэкенд теперь режет access до остатка refresh.
      const expiresAt = Math.min(
        token.accessTokenExpires || 0,
        accessTokenExpiresAt(token.accessToken)
      );
      if (Date.now() < expiresAt) {
        return token;
      }

      // Token expired or close to expiration - refresh
      return refreshAccessToken(token);
    },

    /**
     * Session Callback - session formation for client
     *
     * Passes tokens and user information to session
     */
    async session(params: SessionCallbackParams): Promise<Session> {
      const { session, token } = params;

      // Pass data from JWT to session
      session.user = {
        id: token.id,
        email: token.email,
        // Токены, выданные до перехода на `name` (`LEGACY-380`, 05.10.2026), несут имя
        // от сервера в прежнем поле `displayName`, а `refreshAccessToken` имени
        // не перечитывает. Оно идёт первым: в старом токене Google `name` — имя профиля
        // провайдера из токена Auth.js по умолчанию, а не имя с сервера. Продление сессии
        // переносит поле дальше (`...token`), поэтому срока у таких токенов нет —
        // запасное чтение снимается только вместе с принудительным перелогином.
        name: legacyDisplayName(token) ?? token.name,
        roles: token.roles,
      };
      // `refreshToken` в сессию не кладётся: `/api/auth/session` отдаёт её в браузер,
      // и любой XSS унёс бы его на весь срок refresh (`LEGACY-446`). Он живёт только
      // в зашифрованной JWT-куке, продление идёт на сервере в колбэке `jwt`.
      // `accessToken` остаётся: им ходит http-клиент браузера. Срок его жизни задаёт бэкенд
      // (`JWT_ACCESS_EXPIRES_IN`, по умолчанию 15m); перенос запросов на серверный прокси —
      // отдельная запись (решение арбитра 08.10.2026).
      session.accessToken = token.accessToken;
      session.error = token.error;

      return session;
    },
  },

  // Authorization pages
  pages: {
    signIn: AUTH_ROUTES.SIGN_IN, // TODO (M1): Create sign-in page
    error: AUTH_ROUTES.ERROR, // TODO (M1): Create error page
  },

  // Debug only when explicitly enabled (reduces unnecessary requests)
  debug: process.env.NEXTAUTH_DEBUG === 'true',

  // Secret for JWT
  secret: process.env.NEXTAUTH_SECRET,
};
