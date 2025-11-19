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

import CredentialsProvider from 'next-auth/providers/credentials';
import type { User, Session, Account } from 'next-auth';
import type { JWT } from 'next-auth/jwt';
import {
  AUTH_TOKEN_EXPIRY,
  SESSION_SETTINGS,
  AuthErrorType,
  AUTH_ERROR_MESSAGES,
  AUTH_ROUTES,
} from './constants';

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
      },
      body: JSON.stringify({
        refreshToken: token.refreshToken,
      }),
    });

    // If refresh failed - mark token with error
    if (!response.ok) {
      console.error('Failed to refresh token:', response.status);
      return {
        ...token,
        error: AuthErrorType.REFRESH_TOKEN_ERROR,
      };
    }

    const refreshedTokens = await response.json();

    // Return updated token
    return {
      ...token,
      accessToken: refreshedTokens.accessToken,
      refreshToken: refreshedTokens.refreshToken,
      accessTokenExpires: Date.now() + AUTH_TOKEN_EXPIRY.ACCESS_TOKEN_MS,
      error: undefined, // Reset error if it was set
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
      async authorize(credentials) {
        // Validate required fields
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

          // Handle errors
          if (!response.ok) {
            // Rate limiting
            if (response.status === 429) {
              throw new Error(AUTH_ERROR_MESSAGES[AuthErrorType.RATE_LIMIT_EXCEEDED]);
            }

            // Invalid credentials
            if (response.status === 400 || response.status === 401) {
              throw new Error(AUTH_ERROR_MESSAGES[AuthErrorType.INVALID_CREDENTIALS]);
            }

            // Other errors
            throw new Error('Authentication failed');
          }

          const data = await response.json();

          // Return User object with tokens
          // Roles now come directly from backend in /auth/login
          return {
            id: data.user.id,
            email: data.user.email,
            displayName: data.user.displayName || data.user.name,
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

      // On first login - save tokens from authorize
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

      // Token still valid - return as is
      if (token.accessTokenExpires && Date.now() < token.accessTokenExpires) {
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
        displayName: token.displayName,
        roles: token.roles,
      };
      session.accessToken = token.accessToken;
      session.refreshToken = token.refreshToken;
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
