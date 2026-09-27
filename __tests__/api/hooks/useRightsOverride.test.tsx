/**
 * Решение администратора ставится на книгу, а ответ гейта кэшируется по версии. Промах
 * инвалидации не виден ничем: запрос уходит, ответ 201, а панель публикации соседней версии
 * держит прежний запрет.
 */

import React, { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { versionKeys } from '@/api/hooks/useBookVersions';
import {
  rightsOverrideKeys,
  useGrantRightsOverride,
  useRevokeRightsOverride,
} from '@/api/hooks/useRightsOverride';
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

const seedGates = (client: QueryClient) => {
  client.setQueryData(versionKeys.publicationGate('v1'), { canPublish: false });
  client.setQueryData(versionKeys.publicationGate('v2'), { canPublish: false });
  client.setQueryData(rightsOverrideKeys.book('b1'), { active: null, history: [] });
  client.setQueryData(versionKeys.rightsDashboard('v1'), { verdict: 'BLOCK' });
  client.setQueryData(versionKeys.rightsDashboard('v2'), { verdict: 'BLOCK' });
};

const expectAllInvalidated = (client: QueryClient) => {
  expect(client.getQueryState(versionKeys.publicationGate('v1'))?.isInvalidated).toBe(true);
  expect(client.getQueryState(versionKeys.publicationGate('v2'))?.isInvalidated).toBe(true);
  expect(client.getQueryState(rightsOverrideKeys.book('b1'))?.isInvalidated).toBe(true);
  // Вкладка «Права» держит вердикт BLOCK/ALLOW в сводке каждой версии.
  expect(client.getQueryState(versionKeys.rightsDashboard('v1'))?.isInvalidated).toBe(true);
  expect(client.getQueryState(versionKeys.rightsDashboard('v2'))?.isInvalidated).toBe(true);
};

describe('useRightsOverride — инвалидация', () => {
  it('выдача решения сбрасывает гейт всех версий и само решение', async () => {
    let body: unknown;
    server.use(
      http.post(`${API_BASE}/admin/books/b1/rights-override`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ id: 'ov-1', bookId: 'b1' }, { status: 201 });
      })
    );
    const client = createClient();
    seedGates(client);
    const { result } = renderHook(() => useGrantRightsOverride(), { wrapper: wrapperFor(client) });

    await act(async () => {
      await result.current.mutateAsync({ bookId: 'b1', data: { reasonRu: 'Причина решения' } });
    });

    expect(body).toEqual({ reasonRu: 'Причина решения' });
    expectAllInvalidated(client);
  });

  it('отмена решения сбрасывает гейт всех версий и само решение', async () => {
    server.use(
      http.post(`${API_BASE}/admin/books/b1/rights-override/revoke`, () =>
        HttpResponse.json({ id: 'ov-1', bookId: 'b1' })
      )
    );
    const client = createClient();
    seedGates(client);
    const { result } = renderHook(() => useRevokeRightsOverride(), {
      wrapper: wrapperFor(client),
    });

    await act(async () => {
      await result.current.mutateAsync({ bookId: 'b1', data: {} });
    });

    expectAllInvalidated(client);
  });

  it('409 «решения уже нет» тоже сбрасывает устаревшее состояние', async () => {
    server.use(
      http.post(`${API_BASE}/admin/books/b1/rights-override/revoke`, () =>
        HttpResponse.json(
          { statusCode: 409, message: 'Not active', code: 'RIGHTS_OVERRIDE_NOT_ACTIVE' },
          { status: 409 }
        )
      )
    );
    const client = createClient();
    seedGates(client);
    const onError = vi.fn();
    const { result } = renderHook(() => useRevokeRightsOverride({ onError }), {
      wrapper: wrapperFor(client),
    });

    await act(async () => {
      await result.current.mutateAsync({ bookId: 'b1', data: {} }).catch(() => undefined);
    });

    expect(onError).toHaveBeenCalled();
    expect(onError.mock.calls[0][0]).toMatchObject({
      statusCode: 409,
      data: { code: 'RIGHTS_OVERRIDE_NOT_ACTIVE' },
    });
    expectAllInvalidated(client);
  });
});
