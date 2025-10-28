'use client';

/**
 * AppProviders - корневой провайдер приложения
 *
 * Оборачивает приложение необходимыми провайдерами:
 * - QueryClientProvider (React Query для работы с API)
 * - ConfigProvider (Ant Design для темы и настроек UI)
 */

import type { ReactNode } from 'react';
import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider } from 'antd';
import { QUERY_CACHE_TIME } from '@/lib/queryClient.constants';
import { colors } from '@/styles/tokens';

interface AppProvidersProps {
  children: ReactNode;
}

/**
 * AppProviders компонент
 */
export const AppProviders = (props: AppProvidersProps) => {
  const { children } = props;

  /**
   * Создаём QueryClient один раз при монтировании
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
        {children}
      </ConfigProvider>
    </QueryClientProvider>
  );
};
