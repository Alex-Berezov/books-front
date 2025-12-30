'use client';

/**
 * AppProviders - root application provider
 *
 * Wraps the application with necessary providers:
 * - SessionProvider (NextAuth for authentication)
 * - QueryClientProvider (React Query for API work)
 * - ConfigProvider (Ant Design for theme and UI settings)
 * - SnackbarProvider (Notistack for notifications)
 */

import { useEffect, useState, type ReactNode } from 'react';
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider } from 'antd';
import { SessionProvider } from 'next-auth/react';
import { SnackbarProvider } from 'notistack';
import { ToastConfigurator } from '@/components/common/ToastConfigurator';
import { SESSION_SETTINGS } from '@/lib/auth/constants';
import { setSession } from '@/lib/http-client/auth';
import { QUERY_CACHE_TIME } from '@/lib/queryClient.constants';
import { toast } from '@/lib/utils/toast';
import { ApiError } from '@/types/api';
import type { Session } from 'next-auth';
import { colors } from '@/styles/tokens';

interface AppProvidersProps {
  children: ReactNode;
  session?: Session | null;
}

/**
 * AppProviders component
 */
export const AppProviders = (props: AppProvidersProps) => {
  const { children, session } = props;

  // Initialize session cache in http-client to prevent initial API call
  useEffect(() => {
    if (session) {
      setSession(session);
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
      session={session} // Pass server session to prevent initial client requests
      // Optimize session polling to reduce API calls
      basePath="/api/auth" // Explicit base path for better caching
      refetchInterval={SESSION_SETTINGS.REFETCH_INTERVAL_MINUTES * 60 * 1000} // Convert minutes to milliseconds
      refetchOnWindowFocus={false} // Don't refetch on window focus
      refetchWhenOffline={false} // Don't refetch when offline
    >
      <QueryClientProvider client={queryClient}>
        <ConfigProvider
          theme={{
            token: {
              colorPrimary: colors.primary,
              borderRadius: 4,
            },
          }}
        >
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
        </ConfigProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
};
