/**
 * Тесты ключей и инвалидации кэша версий книги.
 *
 * Ответ гейта публикации зависит от содержимого версии и от её статуса, а лежит он под своим
 * ключом, который не является префиксом `versionKeys.detail`. Промах инвалидации не виден
 * ничем: запрос уходит, ответ 200, а панель публикации до минуты держит прежний вердикт —
 * редактор дописывает описание и всё равно упирается в «Версия не наполнена».
 */

import React, { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import {
  usePublishVersion,
  useUnpublishVersion,
  useUpdateBookVersion,
  versionKeys,
} from '@/api/hooks/useBookVersions';
import { server } from '../../msw/server';

vi.mock('next-auth/react', () => ({
  getSession: vi.fn(() =>
    Promise.resolve({ accessToken: 'test-token', user: { id: 'u1' }, expires: '2099-01-01' })
  ),
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

const API_BASE = 'http://localhost:5000/api';

const createClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0 },
      mutations: { retry: false },
    },
  });

const wrapperFor = (client: QueryClient) => {
  const Wrapper = ({ children }: { children: ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children);
  return Wrapper;
};

describe('versionKeys.publicationGate', () => {
  it('даёт ключ, который не является веткой detail', () => {
    expect(versionKeys.publicationGate('v1')).toEqual(['versions', 'publication-gate', 'v1']);
    expect(versionKeys.publicationGate('v1')).not.toEqual(versionKeys.detail('v1'));
    expect(versionKeys.publicationGate('v1').slice(0, 2)).not.toEqual(
      versionKeys.detail('v1').slice(0, 2)
    );
  });
});

describe('инвалидация ответа гейта', () => {
  it('сбрасывается после сохранения версии', async () => {
    server.use(
      http.patch(`${API_BASE}/versions/v1`, () => HttpResponse.json({ id: 'v1', status: 'draft' }))
    );

    const client = createClient();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useUpdateBookVersion(), { wrapper: wrapperFor(client) });

    await act(async () => {
      await result.current.mutateAsync({ versionId: 'v1', data: { title: 'Новое название' } });
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: versionKeys.publicationGate('v1') });
  });

  it('сбрасывается после публикации', async () => {
    server.use(
      http.patch(`${API_BASE}/versions/v1/publish`, () =>
        HttpResponse.json({ id: 'v1', status: 'published' })
      )
    );

    const client = createClient();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => usePublishVersion(), { wrapper: wrapperFor(client) });

    await act(async () => {
      await result.current.mutateAsync('v1');
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: versionKeys.publicationGate('v1') });
  });

  it('сбрасывается после снятия с публикации', async () => {
    server.use(
      http.patch(`${API_BASE}/versions/v1/unpublish`, () =>
        HttpResponse.json({ id: 'v1', status: 'draft' })
      )
    );

    const client = createClient();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useUnpublishVersion(), { wrapper: wrapperFor(client) });

    await act(async () => {
      await result.current.mutateAsync('v1');
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: versionKeys.publicationGate('v1') });
  });
});
