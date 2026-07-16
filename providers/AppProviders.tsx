'use client';

/**
 * AppProviders - root application provider
 *
 * Wraps the application with necessary providers:
 * - SessionProvider (NextAuth for authentication)
 * - QueryClientProvider (React Query for API work)
 * - ConfigProvider (Ant Design for theme and UI settings) — lazy-loaded (ssr:false)
 *   to keep antd's rc-components off the initial main-thread critical path (TBT).
 * - SnackbarProvider (Notistack for notifications)
 */

import { useEffect, useState, type ReactNode } from 'react';
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import { SessionProvider } from 'next-auth/react';
import { SnackbarProvider } from 'notistack';
import { ToastConfigurator } from '@/components/common/ToastConfigurator';
import { SESSION_SETTINGS } from '@/lib/auth/constants';
import { setSession } from '@/lib/http-client/auth';
import { QUERY_CACHE_TIME } from '@/lib/queryClient.constants';
import { toast } from '@/lib/utils/toast';
import { ApiError } from '@/types/api';
import type { Session } from 'next-auth';

// Lazy-load antd ConfigProvider (ssr:false) so antd's theme + rc-components
// are parsed/evaluated AFTER initial hydration, reducing Total Blocking Time.
// antd components render in SSR HTML with default theme; custom theme applies
// once this wrapper hydrates on the client.
const LazyConfigProvider = dynamic(
  () => import('./LazyConfigProvider').then((m) => m.LazyConfigProvider),
  { ssr: false }
);

interface AppProvidersProps {
  children: ReactNode;
  session?: Session | null;
}

/**
 * AppProviders component
 */
export const AppProviders = (props: AppProvidersProps) => {
  const { children, session } = props;
  const params = useParams();
  const lang = params?.lang as string;

  // Dynamically set html lang attribute for accessibility (screen readers)
  useEffect(() => {
    if (lang && ['en', 'ru', 'es', 'pt', 'fr'].includes(lang)) {
      document.documentElement.lang = lang;
    }
  }, [lang]);

  const [activeSession, setActiveSession] = useState<Session | null | undefined>(() => {
    if (session !== undefined) return session;
    if (typeof window !== 'undefined') {
      const hasLoggedInCookie = document.cookie
        .split(';')
        .some((item) => item.trim().startsWith('logged_in='));
      if (!hasLoggedInCookie) return null;
    }
    return undefined;
  });

  // Initialize session cache in http-client to prevent initial API call
  useEffect(() => {
    if (activeSession) {
      setSession(activeSession);
    }
  }, [activeSession]);

  useEffect(() => {
    if (session !== undefined) {
      setActiveSession(session);
    }
  }, [session]);

  /**
   * Create QueryClient once on mount
   */
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: QUERY_CACHE_TIME.STALE_TIME_MS,
            refetchOnWindowFocus: false,
          },
        },
        queryCache: new QueryCache({
          onError: (error) => {
            // Global error handling for queries
            // Only show toast for server errors (5xx)
            if (error instanceof ApiError && error.statusCode >= 500) {
              toast.error(`Server Error: ${error.message}`);
            }
          },
        }),
        mutationCache: new MutationCache({
          onError: (error) => {
            // Global error handling for mutations
            // Show toast for server errors (5xx)
            if (error instanceof ApiError && error.statusCode >= 500) {
              toast.error(`Server Error: ${error.message}`);
            }
          },
        }),
      })
  );

  return (
    <SessionProvider
      session={activeSession} // Pass active session to prevent initial client requests
      // Optimize session polling to reduce API calls
      basePath="/api/auth" // Explicit base path for better caching
      refetchInterval={SESSION_SETTINGS.REFETCH_INTERVAL_MINUTES * 60} // Convert minutes to seconds (next-auth expects seconds)
      refetchOnWindowFocus={false} // Don't refetch on window focus
      refetchWhenOffline={false} // Don't refetch when offline
    >
      <QueryClientProvider client={queryClient}>
        <LazyConfigProvider>
          <SnackbarProvider
            maxSnack={3}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'left',
            }}
            autoHideDuration={4000}
          >
            <ToastConfigurator />
            {children}
          </SnackbarProvider>
        </LazyConfigProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
};
