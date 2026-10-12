/**
 * NextAuth type extensions for Bibliaris project
 *
 * Defines JWT token structure and user session.
 * `User` and `JWT` carry accessToken, refreshToken, roles and expiration time.
 * Токены есть у `User` и `JWT`, но не у `Session`: сессия уходит в браузер (`LEGACY-446`,
 * `LEGACY-465`); запросы браузера идут через серверный прокси, читающий токен из JWT-куки.
 */

import type { AuthErrorType } from '@/lib/auth/constants';
import type { DefaultSession } from 'next-auth';
import type { JWT as NextAuthJWT } from 'next-auth/jwt';

declare module 'next-auth' {
  /**
   * Extended user information
   */
  interface User {
    id: string;
    email: string;
    name?: string | null;
    roles: string[];
    accessToken: string;
    refreshToken: string;
  }

  /**
   * Extended session with roles — без токенов (`LEGACY-446`, `LEGACY-465`)
   */
  interface Session extends DefaultSession {
    user: {
      id: string;
      email: string;
      name?: string | null;
      roles: string[];
    };
    error?: AuthErrorType;
  }
}

declare module 'next-auth/jwt' {
  /**
   * Extended JWT token with authorization information
   */
  interface JWT extends NextAuthJWT {
    id: string;
    email: string;
    name?: string | null;
    roles: string[];
    accessToken: string;
    refreshToken: string;
    accessTokenExpires: number; // Unix timestamp in milliseconds
    error?: AuthErrorType;
    /**
     * Когда можно повторить refresh после отказа, мс (`LEGACY-451`): временный (429, 5xx, сеть) —
     * «сейчас + пауза», окончательный (400, 401) — `REFRESH_RETRY_NEVER`. Нет поля при `error` —
     * кука до `T122`: один повтор.
     */
    refreshRetryAt?: number;
  }
}
