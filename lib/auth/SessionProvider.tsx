/**
 * Session Provider для NextAuth
 *
 * Обёртка для SessionProvider от next-auth, которая предоставляет
 * контекст сессии для клиентских компонентов.
 *
 * Использование:
 * - Оборачиваем root layout в SessionProvider
 * - В клиентских компонентах используем useSession()
 *
 * TODO (M1): Интегрировать в AppProviders
 */

'use client';

import type { ReactNode } from 'react';
import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react';

interface SessionProviderProps {
  children: ReactNode;
}

/**
 * Провайдер сессии NextAuth
 *
 * Оборачивает дочерние компоненты и предоставляет доступ к сессии
 * через хук useSession() из next-auth/react
 */
export const SessionProvider = (props: SessionProviderProps) => {
  const { children } = props;

  return <NextAuthSessionProvider>{children}</NextAuthSessionProvider>;
};
