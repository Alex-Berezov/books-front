/**
 * NextAuth type extensions for Bibliaris project
 *
 * Defines JWT token structure and user session.
 * Includes fields for accessToken, refreshToken, roles, and expiration time.
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
    displayName?: string;
    roles: string[];
    accessToken: string;
    refreshToken: string;
  }

  /**
   * Extended session with tokens and roles
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
   * Extended JWT token with authorization information
   */
  interface JWT extends NextAuthJWT {
    id: string;
    email: string;
    displayName?: string;
    roles: string[];
    accessToken: string;
    refreshToken: string;
    accessTokenExpires: number; // Unix timestamp in milliseconds
    error?: AuthErrorType;
  }
}
