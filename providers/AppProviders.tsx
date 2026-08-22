'use client';

/**
 * AppProviders - root application provider
 *
 * Wraps the application with necessary providers:
 * - SessionProvider (NextAuth for authentication)
 * - QueryClientProvider (React Query for API work)
 * - SnackbarProvider (Notistack for notifications)
 * - ProgressSyncProvider (сведение локального прогресса чтения с аккаунтом)
 *
 * NOTE: antd ConfigProvider is NOT here — it's only in the admin layout
 *       to keep antd off the public page initial bundle.
 */

import { useEffect, useState, type ReactNode } from 'react';
import { MutationCache, QueryCache, QueryClientProvider } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { SessionProvider } from 'next-auth/react';
import { SnackbarProvider } from 'notistack';
import { ToastConfigurator } from '@/components/common/ToastConfigurator';
import { SESSION_SETTINGS } from '@/lib/auth/constants';
import { hasLoggedInMarker } from '@/lib/auth/sessionMarker';
import { setSession } from '@/lib/http-client/auth';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { getLangFromPath } from '@/lib/i18n/lang';
import { createQueryClient } from '@/lib/queryClient';
import { ProgressSyncProvider } from '@/lib/reading-progress';
import { toast } from '@/lib/utils/toast';
import { ApiError } from '@/types/api';
import type { Session } from 'next-auth';

interface AppProvidersProps {
  children: ReactNode;
  session?: Session | null;
}

const getServerErrorMessage = (): string => {
  const pathname = typeof window === 'undefined' ? '' : window.location.pathname;
  const dict = getDictionary(getLangFromPath(pathname));

  return dict.common.serverError;
};

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
    // `null` здесь означает «точно не залогинен», и провайдер после него не
    // спрашивает сервер до следующего планового опроса. Ставить его можно только
    // по отметке из `sessionMarker` — см. разбор цены ошибок в самом модуле.
    if (typeof window !== 'undefined' && !hasLoggedInMarker()) return null;
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
   *
   * ⚠️ Настройки кэша задаёт `lib/queryClient.ts`, а не этот файл: здесь стоял
   * свой `new QueryClient`, и продуманная стратегия повторов из того файла в
   * приложение не попадала вовсе (`LEGACY-141`). Отсюда приходят только кэши
   * запросов и мутаций — им нужны словари и тост, а слою настроек про них
   * знать незачем.
   */
  const [queryClient] = useState(() =>
    createQueryClient({
      queryCache: new QueryCache({
        onError: (error) => {
          // Global error handling for queries
          // Only show toast for server errors (5xx)
          if (error instanceof ApiError && error.statusCode >= 500) {
            console.error('Server error:', error.message);
            toast.error(getServerErrorMessage());
          }
        },
      }),
      mutationCache: new MutationCache({
        onError: (error) => {
          // Global error handling for mutations
          // Show toast for server errors (5xx)
          if (error instanceof ApiError && error.statusCode >= 500) {
            console.error('Server error:', error.message);
            toast.error(getServerErrorMessage());
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
          <ProgressSyncProvider>{children}</ProgressSyncProvider>
        </SnackbarProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
};
