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

import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  MutationCache,
  QueryCache,
  QueryClientProvider,
  useQueryClient,
} from '@tanstack/react-query';
import { useParams, usePathname } from 'next/navigation';
import { SessionProvider, useSession } from 'next-auth/react';
import { SnackbarProvider } from 'notistack';
import { ToastConfigurator } from '@/components/common/ToastConfigurator';
import { SESSION_SETTINGS, isSessionEndedError } from '@/lib/auth/constants';
import { endDeadSession, isAuthPagePath } from '@/lib/auth/session-end';
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

/**
 * Держит кэш сессии в http-клиенте равным тому, что знает `SessionProvider`.
 *
 * 🔴 Живёт **внутри** провайдера и слушает `useSession`, а не локальное состояние
 * снаружи, и это не стилистика. Кэш `lib/http-client/auth.ts` с `LEGACY-267`
 * помнит и отрицательный ответ («сессии нет») — минуту. Отметка, поставленная
 * один раз на монтировании, за эту минуту протухает молча: вход по паролю идёт
 * через `signIn(..., { redirect: false })` + `router.push`, без перезагрузки
 * страницы, а `session` пропом сюда не приходит вовсе (`app/layout.tsx` рендерит
 * провайдеры без него). Вошедший в первую минуту получал бы 401 ещё до сети — и
 * слияние локального прогресса, идущее ровно в этот момент, пропускало бы все
 * книги разом.
 */
const SessionCacheSync = () => {
  const { data, status } = useSession();

  useEffect(() => {
    // `loading` — это «ещё не знаем»; кэшировать его как «сессии нет» нельзя.
    if (status === 'loading') return;
    setSession(data ?? null);
  }, [data, status]);

  return null;
};

/**
 * Выход по окончательному отказу сессии (`LEGACY-466`): refresh отвергнут (истёк срок, выход на
 * другом устройстве, смена пароля или ролей) либо аккаунт заблокирован. Без него шапка
 * показывала «вошёл», а выход случался лишь на первом 401 личной ручки. Как выходить —
 * `lib/auth/session-end.ts` (решение арбитра 11.10.2026).
 *
 * - Защёлка — от повторного выхода на каждой перерисовке. Снимается, когда ошибка ушла (вошли
 *   снова в той же вкладке без перезагрузки — следующая смерть сессии снова будет замечена),
 *   и при отказе выхода (следующий опрос сессии попробует снова).
 * - После выхода кэш запросов чистится целиком: страница сайта не перезагружается, а ключи
 *   личных запросов (`me`, полка, активность) без `userId` — следующий вошедший в той же
 *   вкладке увидел бы чужие данные.
 * - На странице входа выход не запускается (`isAuthPagePath`).
 */
const SessionEndGuard = () => {
  const { data } = useSession();
  const queryClient = useQueryClient();
  // Путь — в зависимостях: со страницы входа выход не запускается, и уход с неё клиентской
  // ссылкой должен запустить его, а не ждать опроса сессии (15 мин).
  const pathname = usePathname();
  const started = useRef(false);
  const error = data?.error;

  useEffect(() => {
    if (!isSessionEndedError(error)) {
      started.current = false;
      return;
    }
    if (started.current || isAuthPagePath(pathname ?? window.location.pathname)) return;
    started.current = true;
    endDeadSession(error)
      .then(() => queryClient.clear())
      .catch(() => {
        started.current = false;
      });
  }, [data, error, queryClient, pathname]);

  return null;
};

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
      <SessionCacheSync />
      <QueryClientProvider client={queryClient}>
        <SessionEndGuard />
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
