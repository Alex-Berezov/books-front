/**
 * Расширение типов NextAuth для проекта Bibliaris
 *
 * Определяет структуру JWT токенов и сессии пользователя.
 * Включает поля для accessToken, refreshToken, roles и времени истечения.
 */

import type { AuthErrorType } from '@/lib/auth/constants';
import type { DefaultSession } from 'next-auth';
import type { JWT as NextAuthJWT } from 'next-auth/jwt';

declare module 'next-auth' {
  /**
   * Расширенная информация о пользователе
   */
  interface User {
    id: string;
    email: string;
    displayName?: string;
    roles: string[];
    accessToken: string;
    refreshToken: string;
  }

  /**
   * Расширенная сессия с токенами и ролями
   */
  interface Session extends DefaultSession {
    user: {
      id: string;
      email: string;
      displayName?: string;
      roles: string[];
    };
    accessToken: string;
    refreshToken: string;
    error?: AuthErrorType;
  }
}

declare module 'next-auth/jwt' {
  /**
   * Расширенный JWT токен с информацией об авторизации
   */
  interface JWT extends NextAuthJWT {
    id: string;
    email: string;
    displayName?: string;
    roles: string[];
    accessToken: string;
    refreshToken: string;
    accessTokenExpires: number; // Unix timestamp в миллисекундах
    error?: AuthErrorType;
  }
}
