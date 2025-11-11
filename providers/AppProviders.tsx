'use client';

/**
 * AppProviders - root application provider
 *
 * Wraps the application with necessary providers:
 * - QueryClientProvider (React Query for API work)
 * - ConfigProvider (Ant Design for theme and UI settings)
 * - SnackbarProvider (Notistack for notifications)
 */

import type { ReactNode } from 'react';
import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider } from 'antd';
import { SnackbarProvider } from 'notistack';
import { QUERY_CACHE_TIME } from '@/lib/queryClient.constants';
import { colors } from '@/styles/tokens';

interface AppProvidersProps {
  children: ReactNode;
}

/**
 * AppProviders component
 */
export const AppProviders = (props: AppProvidersProps) => {
  const { children } = props;

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
      })
  );

  return (
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
          {children}
        </SnackbarProvider>
      </ConfigProvider>
    </QueryClientProvider>
  );
};
