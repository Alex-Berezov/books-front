/**
 * LEGACY-141: `lib/queryClient.ts` выглядел настройкой кэша, но рабочий клиент
 * создавался отдельным `new QueryClient` в `providers/AppProviders.tsx`. Правка
 * `retry`, `gcTime` или `refetchOn*` в том файле проходила все проверки зелёной
 * и ни на что не влияла.
 *
 * Здесь сторожится именно связка: клиент, который приложение реально отдаёт
 * через контекст, берёт настройки из `lib/queryClient.ts`. Возврат отдельного
 * `new QueryClient` роняет эти проверки.
 */

import type { ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { shouldRetry } from '@/lib/queryClient';
import { QUERY_CACHE_TIME } from '@/lib/queryClient.constants';
import { AppProviders } from '@/providers/AppProviders';
import { ApiError } from '@/types/api';
import type { QueryClient } from '@tanstack/react-query';

const toastMocks = vi.hoisted(() => ({ error: vi.fn() }));

vi.mock('@/lib/utils/toast', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/utils/toast')>();
  return { ...actual, toast: { ...actual.toast, error: toastMocks.error } };
});

vi.mock('next/navigation', () => ({
  useParams: () => ({ lang: 'en' }),
  usePathname: () => '/en',
}));

vi.mock('next-auth/react', () => ({
  SessionProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  getSession: vi.fn(async () => null),
  signOut: vi.fn(async () => undefined),
  // Сводник локального прогресса сидит внутри дерева провайдеров и спрашивает сессию.
  // Здесь проверяется кэш, а не он: анониму сливать нечего, запросов он не делает.
  useSession: () => ({ data: null, status: 'unauthenticated' }),
}));

let captured: QueryClient | undefined;

const Probe = () => {
  captured = useQueryClient();
  return <span>probe</span>;
};

const renderProviders = (): QueryClient => {
  captured = undefined;

  render(
    <AppProviders session={null}>
      <Probe />
    </AppProviders>
  );

  expect(screen.getByText('probe')).toBeInTheDocument();

  const client = captured;
  if (!client) {
    throw new Error('AppProviders не отдал QueryClient через контекст');
  }

  return client;
};

const apiError = (statusCode: number) =>
  new ApiError({ message: 'boom', statusCode, error: 'Test' });

describe('AppProviders и настройки кэша', () => {
  it('отдаёт клиент со стратегией повторов из lib/queryClient.ts', () => {
    const retry = renderProviders().getDefaultOptions().queries?.retry;

    expect(retry).toBe(shouldRetry);
  });

  it('стратегия работает так, как описана в файле: 429 - два повтора, 404 - ноль', () => {
    const retry = renderProviders().getDefaultOptions().queries?.retry;

    expect(typeof retry).toBe('function');
    const attempt = retry as (failureCount: number, error: unknown) => boolean;

    // 429 — две попытки и стоп
    expect(attempt(0, apiError(429))).toBe(true);
    expect(attempt(1, apiError(429))).toBe(true);
    expect(attempt(2, apiError(429))).toBe(false);

    // Прочие 4xx не повторяются вовсе
    expect(attempt(0, apiError(404))).toBe(false);
    expect(attempt(0, apiError(401))).toBe(false);

    // 5xx — три попытки
    expect(attempt(2, apiError(500))).toBe(true);
    expect(attempt(3, apiError(500))).toBe(false);
  });

  it('мутации не повторяются вовсе', () => {
    // Повтор мутации — это второй такой же POST после отказа, у которого мог
    // пройти побочный эффект: второй отзыв, вторая книга, вторая полка.
    // Сведение источников не должно было включить его заодно.
    expect(renderProviders().getDefaultOptions().mutations?.retry).toBe(false);
  });

  it('после разрыва связи данные обновляются', () => {
    // `refetchOnWindowFocus` выключен, и если выключить ещё и это, вернуть
    // данные после разрыва будет нечем — читатель останется на старом снимке.
    expect(renderProviders().getDefaultOptions().queries?.refetchOnReconnect).toBe(true);
  });

  it('время жизни кэша берётся из QUERY_CACHE_TIME, а не из числа рядом', () => {
    const queries = renderProviders().getDefaultOptions().queries;

    expect(queries?.staleTime).toBe(QUERY_CACHE_TIME.STALE_TIME_MS);
    expect(queries?.gcTime).toBe(QUERY_CACHE_TIME.CACHE_TIME_MS);
    expect(queries?.refetchOnWindowFocus).toBe(false);
  });

  it('тосты на 5xx не потерялись при переходе на общую фабрику', () => {
    // `queryCache` и `mutationCache` приходят из AppProviders: если их
    // перестанут передавать в createQueryClient, читатель молча лишится
    // сообщения об отказе сервера.
    const client = renderProviders();

    expect(client.getQueryCache().config.onError).toBeTypeOf('function');
    expect(client.getMutationCache().config.onError).toBeTypeOf('function');
  });

  describe('общий тост 5xx и коды, которые экран разбирает сам (F05-1s)', () => {
    const error503 = (code?: string) =>
      new ApiError({ statusCode: 503, message: 'x', ...(code ? { data: { code } } : {}) });
    const LOCAL = { localErrorCodes: ['LLM_MODELS_UNAVAILABLE'] };

    type Fire = (client: QueryClient, error: ApiError, meta?: Record<string, unknown>) => void;
    const fireQuery: Fire = (client, error, meta) =>
      client.getQueryCache().config.onError?.(error, { meta } as never);
    const fireMutation: Fire = (client, error, meta) =>
      client
        .getMutationCache()
        .config.onError?.(error, undefined, undefined, { meta } as never, {} as never);

    it.each([
      ['запрос', fireQuery],
      ['мутация', fireMutation],
    ])('%s: объявленный код — без тоста, другой код и без meta — тост', (_, fire) => {
      const client = renderProviders();
      toastMocks.error.mockClear();
      fire(client, error503('LLM_MODELS_UNAVAILABLE'), LOCAL);
      expect(toastMocks.error).not.toHaveBeenCalled();

      fire(client, error503('OTHER'), LOCAL);
      expect(toastMocks.error).toHaveBeenCalledTimes(1);

      fire(client, error503('LLM_MODELS_UNAVAILABLE'));
      expect(toastMocks.error).toHaveBeenCalledTimes(2);
    });
  });
});
