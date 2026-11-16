/**
 * F08-2: что после записи перечитывает вкладка World. Правка главы — только если менялся текст или
 * номер (правка названия пересчёт не ставит, R4); запись сущности, поставившая пересчёт, — список
 * и карточки соседей, своя карточка — из ответа; без пересчёта — только список; удаление — всё.
 */
import React, { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  bookWorldQueryKeys,
  useDeleteBookWorldEntity,
  useSaveBookWorldEntity,
} from '@/api/hooks/useBookWorld';
import { useUpdateChapter } from '@/api/hooks/useChapters';

const world = vi.hoisted(() => ({ recountQueued: true }));

vi.mock('@/api/endpoints/admin/chapters', () => ({
  getChapters: vi.fn(),
  createChapter: vi.fn(),
  updateChapter: vi.fn(async () => ({ id: 'c1', bookVersionId: 'v1', number: 1 })),
  deleteChapter: vi.fn(),
}));

vi.mock('@/api/endpoints/admin/bookWorld', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  saveBookWorldEntity: vi.fn(async () => ({
    entity: { key: 'a', updatedAt: '2026-11-16T00:00:00.000Z' },
    hasCore: false,
    warnings: [],
    recountQueued: world.recountQueued,
  })),
  deleteBookWorldEntity: vi.fn(async () => undefined),
}));

const seeded = () => {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  client.setQueryData(bookWorldQueryKeys.list('v1'), { entities: [] });
  client.setQueryData(bookWorldQueryKeys.entity('v1', 'a'), { entity: { key: 'a' } });
  client.setQueryData(bookWorldQueryKeys.entity('v1', 'b'), { entity: { key: 'b' } });
  const wrapper = ({ children }: { children: ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children);
  const stale = (key: readonly unknown[]) => client.getQueryState(key)?.isInvalidated === true;
  return { client, wrapper, stale };
};

describe('book world invalidation after writes (F08-2)', () => {
  it('a chapter title edit leaves the world alone; a text edit invalidates it', async () => {
    const { wrapper, stale } = seeded();
    const { result } = renderHook(() => useUpdateChapter(), { wrapper });
    await act(() =>
      result.current.mutateAsync({ chapterId: 'c1', versionId: 'v1', data: { title: 'T' } })
    );
    expect(stale(bookWorldQueryKeys.list('v1'))).toBe(false);
    expect(stale(bookWorldQueryKeys.entity('v1', 'b'))).toBe(false);

    await act(() =>
      result.current.mutateAsync({ chapterId: 'c1', versionId: 'v1', data: { content: '<p/>' } })
    );
    expect(stale(bookWorldQueryKeys.list('v1'))).toBe(true);
    expect(stale(bookWorldQueryKeys.entity('v1', 'b'))).toBe(true);
  });

  it('an entity save that queued a recount: list and neighbours, not its own card', async () => {
    world.recountQueued = true;
    const { wrapper, stale } = seeded();
    const { result } = renderHook(() => useSaveBookWorldEntity(), { wrapper });
    await act(() => result.current.mutateAsync({ versionId: 'v1', key: 'a', data: {} as never }));
    expect(stale(bookWorldQueryKeys.list('v1'))).toBe(true);
    expect(stale(bookWorldQueryKeys.entity('v1', 'b'))).toBe(true);
    expect(stale(bookWorldQueryKeys.entity('v1', 'a'))).toBe(false);
  });

  it('an entity save without a recount: the list only', async () => {
    world.recountQueued = false;
    const { wrapper, stale } = seeded();
    const { result } = renderHook(() => useSaveBookWorldEntity(), { wrapper });
    await act(() => result.current.mutateAsync({ versionId: 'v1', key: 'a', data: {} as never }));
    expect(stale(bookWorldQueryKeys.list('v1'))).toBe(true);
    expect(stale(bookWorldQueryKeys.entity('v1', 'b'))).toBe(false);
  });

  it('an entity delete: the list and every other card', async () => {
    const { wrapper, stale } = seeded();
    const { result } = renderHook(() => useDeleteBookWorldEntity(), { wrapper });
    await act(() => result.current.mutateAsync({ versionId: 'v1', key: 'a' }));
    expect(stale(bookWorldQueryKeys.list('v1'))).toBe(true);
    expect(stale(bookWorldQueryKeys.entity('v1', 'b'))).toBe(true);
  });
});
