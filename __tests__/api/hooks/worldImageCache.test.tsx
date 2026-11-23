/**
 * F08-11c (хвосты ревью 11b, решение `F08 | F08-11b`): ключ картинки героя лежит под ключом
 * сущности — импорт, пересчёт и удаление сбрасывают его вместе с карточкой; ответ 202 «Generate»
 * и ответ «Accept» отменяют летящее перечитывание до записи своего состояния в кэш.
 */
import React, { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  bookWorldQueryKeys,
  useAcceptWorldImage,
  useDeleteBookWorldEntity,
  useGenerateWorldImage,
  useSaveBookWorld,
  useSaveBookWorldEntity,
} from '@/api/hooks';

const STATE = { key: 'a', allowed: true, accepted: null, acceptedAt: null, pending: null };

vi.mock('@/api/endpoints/admin/bookWorld', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  saveBookWorld: vi.fn(async () => ({ world: null })),
  saveBookWorldEntity: vi.fn(async () => ({
    entity: { key: 'a', updatedAt: '2026-11-23T00:00:00.000Z' },
    hasCore: false,
    warnings: [],
    recountQueued: true,
  })),
  deleteBookWorldEntity: vi.fn(async () => undefined),
  generateWorldImage: vi.fn(async () => ({ ...STATE, generation: { status: 'active' } })),
  acceptWorldImage: vi.fn(async () => ({ ...STATE, generation: null })),
}));

const seeded = () => {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  client.setQueryData(bookWorldQueryKeys.list('v1'), { entities: [] });
  for (const k of ['a', 'b']) {
    client.setQueryData(bookWorldQueryKeys.entity('v1', k), { entity: { key: k } });
    client.setQueryData(bookWorldQueryKeys.image('v1', k), { ...STATE, key: k });
  }
  client.setQueryData(bookWorldQueryKeys.image('v2', 'a'), STATE);
  const wrapper = ({ children }: { children: ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children);
  const stale = (key: readonly unknown[]) => client.getQueryState(key)?.isInvalidated === true;
  return { client, wrapper, stale };
};

describe('illustration cache key (F08-11c)', () => {
  it('import JSON of the version: every illustration of the version, not of another', async () => {
    const { wrapper, stale } = seeded();
    const { result } = renderHook(() => useSaveBookWorld(), { wrapper });
    await act(() => result.current.mutateAsync({ versionId: 'v1', data: {} as never }));
    expect(stale(bookWorldQueryKeys.image('v1', 'a'))).toBe(true);
    expect(stale(bookWorldQueryKeys.image('v1', 'b'))).toBe(true);
    expect(stale(bookWorldQueryKeys.image('v2', 'a'))).toBe(false);
  });

  it('entity save with a recount: its own illustration and the neighbours', async () => {
    const { wrapper, stale } = seeded();
    const { result } = renderHook(() => useSaveBookWorldEntity(), { wrapper });
    await act(() => result.current.mutateAsync({ versionId: 'v1', key: 'a', data: {} as never }));
    expect(stale(bookWorldQueryKeys.image('v1', 'a'))).toBe(true);
    expect(stale(bookWorldQueryKeys.image('v1', 'b'))).toBe(true);
  });

  it('delete: the illustration of the deleted entity leaves the cache', async () => {
    const { client, wrapper } = seeded();
    const { result } = renderHook(() => useDeleteBookWorldEntity(), { wrapper });
    await act(() => result.current.mutateAsync({ versionId: 'v1', key: 'a' }));
    expect(client.getQueryState(bookWorldQueryKeys.image('v1', 'a'))).toBeUndefined();
    expect(client.getQueryData(bookWorldQueryKeys.image('v1', 'b'))).toBeDefined();
  });

  it.each([
    ['Generate 202', 'active'],
    ['Accept', null],
  ])(
    '%s: a re-read in flight does not overwrite the state from the response',
    async (name, status) => {
      const { client, wrapper } = seeded();
      const key = bookWorldQueryKeys.image('v1', 'a');
      let late!: (value: unknown) => void;
      const inflight = client
        .fetchQuery({ queryKey: key, queryFn: () => new Promise((resolve) => (late = resolve)) })
        .catch(() => undefined);
      if (name === 'Accept') {
        const { result } = renderHook(() => useAcceptWorldImage(), { wrapper });
        await act(() => result.current.mutateAsync({ versionId: 'v1', key: 'a', mediaId: 'm1' }));
      } else {
        const { result } = renderHook(() => useGenerateWorldImage(), { wrapper });
        await act(() => result.current.mutateAsync({ versionId: 'v1', key: 'a' }));
      }
      // Запоздавший ответ старого GET: без отмены он затёр бы состояние из ответа мутации.
      late({ ...STATE, generation: { status: 'stale' } });
      // Ждём, пока старый GET дойдёт до конца: отменённый - отказом, неотменённый - записью в кэш.
      await act(async () => {
        await inflight;
        await new Promise((resolve) => setTimeout(resolve, 0));
      });
      expect(client.isFetching()).toBe(0);
      const state = client.getQueryData<{ generation: { status: string } | null }>(key);
      expect(state?.generation?.status ?? null).toBe(status);
    }
  );
});
