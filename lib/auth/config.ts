/**
 * Конфигурация NextAuth для проекта Bibliaris
 *
 * Содержит настройки авторизации через Credentials Provider,
 * callbacks для работы с JWT и сессиями, а также обработку refresh токенов.
 *
 * TODO (M1): Реализовать полную логику авторизации
 *
 * @see https://next-auth.js.org/configuration/options
 */

import CredentialsProvider from 'next-auth/providers/credentials';
import type { User, Session, Account } from 'next-auth';
import type { JWT } from 'next-auth/jwt';
import { AUTH_TOKEN_EXPIRY, AuthErrorType, AUTH_ERROR_MESSAGES, AUTH_ROUTES } from './constants';

/**
 * Параметры JWT callback
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
 * Параметры Session callback
 */
interface SessionCallbackParams {
  session: Session;
  token: JWT;
  user?: User;
}

/**
 * Обновление access токена через refresh токен
 *
 * Вызывает POST /auth/refresh для получения новой пары токенов
 *
 * @param token - текущий JWT токен
 * @returns обновлённый токен или токен с ошибкой
 */
export const refreshAccessToken = async (token: JWT): Promise<JWT> => {
  try {
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api';

    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        refreshToken: token.refreshToken,
      }),
    });

    // Если refresh не удался - помечаем токен ошибкой
    if (!response.ok) {
      console.error('Failed to refresh token:', response.status);
      return {
        ...token,
        error: AuthErrorType.REFRESH_TOKEN_ERROR,
      };
    }

    const refreshedTokens = await response.json();

    // Возвращаем обновленный токен
    return {
      ...token,
      accessToken: refreshedTokens.accessToken,
      refreshToken: refreshedTokens.refreshToken,
      accessTokenExpires: Date.now() + AUTH_TOKEN_EXPIRY.ACCESS_TOKEN_MS,
      error: undefined, // Сбрасываем ошибку если была
    };
  } catch (error) {
    console.error('Error refreshing access token:', error);
    return {
      ...token,
      error: AuthErrorType.REFRESH_TOKEN_ERROR,
    };
  }
};

/**
 * Конфигурация NextAuth
 *
 * Для next-auth v5 используется упрощённый объект конфигурации
 */
export const authOptions = {
  // Использование JWT для сессий (не database)
  session: {
    strategy: 'jwt' as const,
    maxAge: AUTH_TOKEN_EXPIRY.REFRESH_TOKEN_SECONDS,
  },

  // Провайдеры авторизации
  providers: [
    CredentialsProvider({
      id: 'credentials',
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'user@example.com' },
        password: { label: 'Password', type: 'password' },
      },
      /**
       * Авторизация пользователя через бэкенд
       *
       * Вызывает POST /auth/login и возвращает пользователя с токенами
       */
      async authorize(credentials) {
        // Валидация обязательных полей
        if (!credentials?.email || !credentials?.password) {
          throw new Error(AUTH_ERROR_MESSAGES[AuthErrorType.MISSING_CREDENTIALS]);
        }

        const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api';

        try {
          const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          });

          // Обработка ошибок
          if (!response.ok) {
            // Rate limiting
            if (response.status === 429) {
              throw new Error(AUTH_ERROR_MESSAGES[AuthErrorType.RATE_LIMIT_EXCEEDED]);
            }

            // Неверные учетные данные
            if (response.status === 400 || response.status === 401) {
              throw new Error(AUTH_ERROR_MESSAGES[AuthErrorType.INVALID_CREDENTIALS]);
            }

            // Прочие ошибки
            throw new Error('Authentication failed');
          }

          const data = await response.json();

          // Возвращаем объект User с токенами
          // Роли теперь приходят напрямую от бэкенда в /auth/login
          return {
            id: data.user.id,
            email: data.user.email,
            displayName: data.user.displayName || data.user.name,
            roles: data.user.roles || [],
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
          };
        } catch (error) {
          // Прокидываем ошибку дальше для обработки в UI
          if (error instanceof Error) {
            throw error;
          }
          throw new Error('Authentication failed');
        }
      },
    }),
  ],

  // Callbacks для обработки JWT и сессий
  callbacks: {
    /**
     * JWT Callback - обработка токенов
     *
     * Сохраняет токены при логине и автоматически обновляет их при истечении
     */
    async jwt(params: JWTCallbackParams): Promise<JWT> {
      const { token, user, account } = params;

      // При первом логине - сохранить токены из authorize
      if (account && user) {
        return {
          ...token,
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          roles: user.roles,
          accessToken: user.accessToken,
          refreshToken: user.refreshToken,
          accessTokenExpires: Date.now() + AUTH_TOKEN_EXPIRY.ACCESS_TOKEN_MS,
        };
      }

      // Токен ещё валиден - возвращаем как есть
      if (token.accessTokenExpires && Date.now() < token.accessTokenExpires) {
        return token;
      }

      // Токен истёк или близок к истечению - обновить
      return refreshAccessToken(token);
    },

    /**
     * Session Callback - формирование сессии для клиента
     *
     * Прокидывает токены и информацию о пользователе в сессию
     */
    async session(params: SessionCallbackParams): Promise<Session> {
      const { session, token } = params;

      // Прокинуть данные из JWT в сессию
      session.user = {
        id: token.id,
        email: token.email,
        displayName: token.displayName,
        roles: token.roles,
      };
      session.accessToken = token.accessToken;
      session.refreshToken = token.refreshToken;
      session.error = token.error;

      return session;
    },
  },

  // Страницы авторизации
  pages: {
    signIn: AUTH_ROUTES.SIGN_IN, // TODO (M1): Создать страницу входа
    error: AUTH_ROUTES.ERROR, // TODO (M1): Создать страницу ошибок
  },

  // Debug в development
  debug: process.env.NODE_ENV === 'development',

  // Secret для JWT
  secret: process.env.NEXTAUTH_SECRET,
};
