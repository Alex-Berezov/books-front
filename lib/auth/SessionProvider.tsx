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
import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react';

interface SessionProviderProps {
  children: ReactNode;
}

/**
 * NextAuth session provider
 *
 * Wraps child components and provides access to session
 * via useSession() hook from next-auth/react
 */
export const SessionProvider = (props: SessionProviderProps) => {
  const { children } = props;

  return <NextAuthSessionProvider>{children}</NextAuthSessionProvider>;
};
