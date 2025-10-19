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

import type { JWT } from 'next-auth/jwt';
import type { User, Session, Account } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
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
 * TODO (M1): Реализовать логику вызова POST /api/auth/refresh
 * TODO (M1): Обработать ошибки refresh (401/403)
 * TODO (M1): Реализовать signOut при неудачном refresh
 *
 * @param token - текущий JWT токен
 * @returns обновлённый токен или токен с ошибкой
 */
export const refreshAccessToken = async (token: JWT): Promise<JWT> => {
  // TODO (M1): Реализовать refresh логику
  // const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/refresh`, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ refreshToken: token.refreshToken }),
  // });
  //
  // if (!response.ok) {
  //   return { ...token, error: 'RefreshAccessTokenError' };
  // }
  //
  // const refreshedTokens = await response.json();
  // return {
  //   ...token,
  //   accessToken: refreshedTokens.accessToken,
  //   refreshToken: refreshedTokens.refreshToken,
  //   accessTokenExpires: Date.now() + AUTH_TOKEN_EXPIRY.ACCESS_TOKEN_MS,
  // };

  console.warn('refreshAccessToken: TODO - реализовать в M1');
  return { ...token, error: AuthErrorType.REFRESH_TOKEN_ERROR };
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
       * TODO (M1): Реализовать вызов POST /api/auth/login
       * TODO (M1): Обработать ошибки валидации (400)
       * TODO (M1): Обработать rate limiting (429)
       * TODO (M1): Вернуть объект User с токенами
       */
      async authorize(credentials) {
        // TODO (M1): Реализовать авторизацию
        // if (!credentials?.email || !credentials?.password) {
        //   throw new Error('Email and password are required');
        // }
        //
        // const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/login`, {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify({
        //     email: credentials.email,
        //     password: credentials.password,
        //   }),
        // });
        //
        // if (!response.ok) {
        //   if (response.status === 429) {
        //     throw new Error('Too many requests. Please try again later.');
        //   }
        //   throw new Error('Invalid credentials');
        // }
        //
        // const data = await response.json();
        // return {
        //   id: data.user.id,
        //   email: data.user.email,
        //   displayName: data.user.displayName,
        //   roles: data.user.roles,
        //   accessToken: data.accessToken,
        //   refreshToken: data.refreshToken,
        // };

        console.warn('authorize: TODO - реализовать в M1');
        return null;
      },
    }),
  ],

  // Callbacks для обработки JWT и сессий
  callbacks: {
    /**
     * JWT Callback - обработка токенов
     *
     * TODO (M1): Реализовать сохранение токенов при логине
     * TODO (M1): Реализовать проверку истечения токена
     * TODO (M1): Реализовать автоматический refresh
     */
    async jwt(params: JWTCallbackParams): Promise<JWT> {
      const { token, user, account } = params;

      // TODO (M1): При первом логине - сохранить токены
      // if (account && user) {
      //   return {
      //     ...token,
      //     id: user.id,
      //     email: user.email,
      //     displayName: user.displayName,
      //     roles: user.roles,
      //     accessToken: user.accessToken,
      //     refreshToken: user.refreshToken,
      //     accessTokenExpires: Date.now() + AUTH_TOKEN_EXPIRY.ACCESS_TOKEN_MS,
      //   };
      // }
      //
      // // Токен ещё валиден
      // if (Date.now() < token.accessTokenExpires) {
      //   return token;
      // }
      //
      // // Токен истёк - обновить
      // return refreshAccessToken(token);

      console.warn('jwt callback: TODO - реализовать в M1');
      return token;
    },

    /**
     * Session Callback - формирование сессии для клиента
     *
     * TODO (M1): Прокинуть accessToken в сессию
     * TODO (M1): Прокинуть информацию о пользователе и ролях
     * TODO (M1): Обработать ошибки refresh
     */
    async session(params: SessionCallbackParams): Promise<Session> {
      const { session, token } = params;

      // TODO (M1): Прокинуть данные из JWT в сессию
      // session.user = {
      //   id: token.id,
      //   email: token.email,
      //   displayName: token.displayName,
      //   roles: token.roles,
      // };
      // session.accessToken = token.accessToken;
      // session.refreshToken = token.refreshToken;
      // session.error = token.error;

      console.warn('session callback: TODO - реализовать в M1');
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
