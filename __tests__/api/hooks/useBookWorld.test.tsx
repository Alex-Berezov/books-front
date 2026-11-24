import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { bookWorldQueryKeys, useSetBookWorldEntityFlags } from '@/api/hooks/useBookWorld';
import type {
  BookWorldEntityResponse,
  BookWorldEntitySummary,
  BookWorldListResponse,
} from '@/types/api-schema';
import { detail } from '../../helpers/worldApi';

/**
 * F08-1: в кэш списка ложится только ответ последнего запроса флага по сущности — ответ раньше
 * ушедшего, пришедший позже, не откатывает переключатель (круг /fix 1, п.4).
 */

const api = vi.hoisted(() => ({ setBookWorldEntityFlags: vi.fn() }));
vi.mock('@/api/endpoints/admin/bookWorld', () => api);

const row = (isIndexable: boolean): BookWorldEntitySummary => ({
  key: 'sonya',
  type: 'character',
  name: 'Sonya',
  role: 'secondary',
  short: null,
  hasCore: false,
  isIndexable,
  mentionFirst: null,
  updatedAt: '2026-11-14T09:00:00.000Z',
});

const deferred = <T,>() => {
  let resolve: (value: T) => void = () => undefined;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
};

describe('useSetBookWorldEntityFlags', () => {
  it('the answer of an earlier request that comes later does not overwrite the latest', async () => {
    const client = new QueryClient();
    const list: BookWorldListResponse = {
      language: 'en',
      alternates: [],
      entities: [row(true)],
      places: [],
    };
    client.setQueryData(bookWorldQueryKeys.list('v1'), list);
    const first = deferred<BookWorldEntitySummary>();
    const second = deferred<BookWorldEntitySummary>();
    api.setBookWorldEntityFlags
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useSetBookWorldEntityFlags(), { wrapper });

    let a: Promise<unknown> = Promise.resolve();
    let b: Promise<unknown> = Promise.resolve();
    act(() => {
      a = result.current.mutateAsync({
        versionId: 'v1',
        key: 'sonya',
        flags: { isIndexable: false },
      });
      b = result.current.mutateAsync({
        versionId: 'v1',
        key: 'sonya',
        flags: { isIndexable: true },
      });
    });
    await act(async () => {
      second.resolve(row(true));
      await b;
      first.resolve(row(false));
      await a;
    });

    const cached = client.getQueryData<BookWorldListResponse>(bookWorldQueryKeys.list('v1'));
    expect(cached?.entities[0].isIndexable).toBe(true);
  });

  it('R6: a flag answer does not move updatedAt of the list row nor of the open entity', async () => {
    const client = new QueryClient();
    client.setQueryData(bookWorldQueryKeys.list('v1'), {
      language: 'en',
      alternates: [],
      entities: [row(true)],
      places: [],
    } satisfies BookWorldListResponse);
    const opened = detail('sonya');
    client.setQueryData(bookWorldQueryKeys.entity('v1', 'sonya'), {
      ...opened,
      entity: { ...opened.entity, updatedAt: '2026-11-14T09:00:00.000Z' },
    } satisfies BookWorldEntityResponse);
    api.setBookWorldEntityFlags.mockResolvedValueOnce({
      ...row(false),
      updatedAt: '2026-11-14T13:00:00.000Z',
    });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useSetBookWorldEntityFlags(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({
        versionId: 'v1',
        key: 'sonya',
        flags: { isIndexable: false },
      });
    });
    const list = client.getQueryData<BookWorldListResponse>(bookWorldQueryKeys.list('v1'));
    expect(list?.entities[0]).toMatchObject({
      isIndexable: false,
      updatedAt: '2026-11-14T09:00:00.000Z',
    });
    const entity = client.getQueryData<BookWorldEntityResponse>(
      bookWorldQueryKeys.entity('v1', 'sonya')
    );
    expect(entity?.entity).toMatchObject({
      isIndexable: false,
      updatedAt: '2026-11-14T09:00:00.000Z',
    });
  });
});
