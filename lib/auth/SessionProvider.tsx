/**
 * Session Provider for NextAuth
 *
 * Wrapper for SessionProvider from next-auth that provides
 * session context for client components.
 *
 * Usage:
 * - Wrap root layout in SessionProvider
 * - In client components use useSession()
 *
 * TODO (M1): Integrate into AppProviders
 */

'use client';

import type { ReactNode } from 'react';
import {
  SessionProvider as NextAuthSessionProvider,
  type SessionProviderProps as NextAuthSessionProviderProps,
} from 'next-auth/react';

export type { SessionProviderProps as NextAuthSessionProviderProps } from 'next-auth/react';

/**
 * NextAuth session provider
 *
 * Wraps child components and provides access to session
 * via useSession() hook from next-auth/react
 *
 * Forwards all NextAuth SessionProvider props,
 * including refetchInterval, refetchOnWindowFocus, etc.
 */
export const SessionProvider = ({
  children,
  ...props
}: { children: ReactNode } & Partial<NextAuthSessionProviderProps>) => {
  return <NextAuthSessionProvider {...props}>{children}</NextAuthSessionProvider>;
};
