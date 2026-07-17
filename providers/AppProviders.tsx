'use client';

/**
 * AppProviders - root application provider
 *
 * Wraps the application with necessary providers:
 * - SessionProvider (NextAuth for authentication)
 * - QueryClientProvider (React Query for API work)
 * - SnackbarProvider (Notistack for notifications)
 *
 * NOTE: antd ConfigProvider is NOT here — it's only in the admin layout
 *       to keep antd off the public page initial bundle.
 */

import { useEffect, useState, type ReactNode } from 'react';
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
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
      </QueryClientProvider>
    </SessionProvider>
  );
};
