/**
 * F08-11c (хвосты ревью 11b, решение `F08 | F08-11b`): ключ картинки героя лежит под ключом
 * сущности — импорт, пересчёт и удаление сбрасывают его вместе с карточкой; ответ «Accept»
 * отменяет летящее перечитывание до записи своего состояния в кэш (генерации нет с F08-11d).
 * F08-11d-3: так же ответ загрузки файла; отказ загрузки перечитывает состояние.
 */
import React, { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  bookWorldQueryKeys,
  useAcceptWorldImage,
  useUploadWorldImage,
  useDeleteBookWorldEntity,
  useSaveBookWorld,
  useSaveBookWorldEntity,
} from '@/api/hooks';
import { ApiError } from '@/types/api';

const STATE = {
  key: 'a',
  allowed: true,
  roleAllowed: true,
  keyConflict: false,
  accepted: null,
  acceptedAt: null,
  pending: null,
};

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
  acceptWorldImage: vi.fn(async (_v: string, key: string) => {
    if (key === 'b') {
      throw new ApiError({
        statusCode: 409,
        message: 'x',
        data: { code: 'WORLD_IMAGE_ENTITY_CHANGED' },
      });
    }
    return { ...STATE, accepted: { mediaId: 'm1' } };
  }),
  uploadWorldImage: vi.fn(async (_v: string, key: string) => {
    if (key === 'refused') throw new Error('409');
    if (key === 'b') {
      throw new ApiError({
        statusCode: 409,
        message: 'x',
        data: { code: 'WORLD_IMAGE_ENTITY_CHANGED' },
      });
    }
    return { ...STATE, pending: { mediaId: 'up1' } };
  }),
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

  it('Accept: a re-read in flight does not overwrite the state from the response', async () => {
    const { client, wrapper } = seeded();
    const key = bookWorldQueryKeys.image('v1', 'a');
    let late!: (value: unknown) => void;
    const inflight = client
      .fetchQuery({ queryKey: key, queryFn: () => new Promise((resolve) => (late = resolve)) })
      .catch(() => undefined);
    const { result } = renderHook(() => useAcceptWorldImage(), { wrapper });
    await act(() => result.current.mutateAsync({ versionId: 'v1', key: 'a', mediaId: 'm1' }));
    // Запоздавший ответ старого GET: без отмены он затёр бы состояние из ответа мутации.
    late({ ...STATE, accepted: { mediaId: 'stale' } });
    // Ждём, пока старый GET дойдёт до конца: отменённый - отказом, неотменённый - записью в кэш.
    await act(async () => {
      await inflight;
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(client.isFetching()).toBe(0);
    const state = client.getQueryData<{ accepted: { mediaId: string } | null }>(key);
    expect(state?.accepted?.mediaId ?? null).toBe('m1');
  });

  it('upload: a re-read in flight does not overwrite the state from the response', async () => {
    const { client, wrapper } = seeded();
    const key = bookWorldQueryKeys.image('v1', 'a');
    let late!: (value: unknown) => void;
    const inflight = client
      .fetchQuery({ queryKey: key, queryFn: () => new Promise((resolve) => (late = resolve)) })
      .catch(() => undefined);
    const { result } = renderHook(() => useUploadWorldImage(), { wrapper });
    const file = new File(['x'], 'p.png', { type: 'image/png' });
    await act(() => result.current.mutateAsync({ versionId: 'v1', key: 'a', file }));
    late({ ...STATE, pending: { mediaId: 'stale' } });
    await act(async () => {
      await inflight;
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    const state = client.getQueryData<{ pending: { mediaId: string } | null }>(key);
    expect(state?.pending?.mediaId ?? null).toBe('up1');
  });

  it('upload refused: only its own illustration is re-read', async () => {
    const { client, wrapper, stale } = seeded();
    client.setQueryData(bookWorldQueryKeys.image('v1', 'refused'), STATE);
    const { result } = renderHook(() => useUploadWorldImage(), { wrapper });
    const file = new File(['x'], 'p.png', { type: 'image/png' });
    await act(async () => {
      await result.current
        .mutateAsync({ versionId: 'v1', key: 'refused', file })
        .catch(() => undefined);
    });
    expect(stale(bookWorldQueryKeys.image('v1', 'refused'))).toBe(true);
    expect(stale(bookWorldQueryKeys.image('v1', 'a'))).toBe(false);
  });

  // F08-12c-2: тип сущности сменился параллельно - перечитывается карточка (тип и предел панели),
  // картинка лежит под ней; соседняя карточка не трогается.
  it('upload refused with WORLD_IMAGE_ENTITY_CHANGED: the entity card is re-read with its illustration', async () => {
    const { wrapper, stale } = seeded();
    const { result } = renderHook(() => useUploadWorldImage(), { wrapper });
    await act(async () => {
      await result.current
        .mutateAsync({ versionId: 'v1', key: 'b', file: new File(['x'], 'x.png') })
        .catch(() => undefined);
    });
    expect(stale(bookWorldQueryKeys.entity('v1', 'b'))).toBe(true);
    expect(stale(bookWorldQueryKeys.image('v1', 'b'))).toBe(true);
    expect(stale(bookWorldQueryKeys.entity('v1', 'a'))).toBe(false);
  });

  it('Accept refused with WORLD_IMAGE_ENTITY_CHANGED: the entity card is re-read too', async () => {
    const { wrapper, stale } = seeded();
    const { result } = renderHook(() => useAcceptWorldImage(), { wrapper });
    await act(async () => {
      await result.current
        .mutateAsync({ versionId: 'v1', key: 'b', mediaId: 'm1' })
        .catch(() => undefined);
    });
    expect(stale(bookWorldQueryKeys.entity('v1', 'b'))).toBe(true);
    expect(stale(bookWorldQueryKeys.image('v1', 'b'))).toBe(true);
    expect(stale(bookWorldQueryKeys.entity('v1', 'a'))).toBe(false);
  });
});
