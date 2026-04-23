/**
 * React Query hook tests for the admin audio-chapters surface.
 *
 * Uses `renderHook` + a dedicated `QueryClient` with `retry: false, gcTime: 0`
 * and MSW to mock the REST API. `next-auth/react` is mocked so authed calls
 * resolve.
 */

import React, { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import {
  audioChapterKeys,
  useAudioChapter,
  useAudioChapters,
  useCreateAudioChapter,
  useDeleteAudioChapter,
  useReorderAudioChapters,
  useUpdateAudioChapter,
} from '@/api/hooks/useAudioChapters';
import { server } from '../../msw/server';

vi.mock('next-auth/react', () => ({
  getSession: vi.fn(() =>
    Promise.resolve({ accessToken: 'test-token', user: { id: 'u1' }, expires: '2099-01-01' })
  ),
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

const API_BASE = 'http://localhost:5000/api';

const makeChapter = (overrides: Record<string, unknown> = {}) => ({
  id: 'ac-1',
  bookVersionId: 'ver-1',
  number: 1,
  title: 'Chapter',
  audioUrl: 'https://cdn/x.mp3',
  mediaId: null,
  duration: 10,
  description: null,
  transcript: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  ...overrides,
});

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

describe('audioChapterKeys', () => {
  it('produces stable, distinct keys for list/detail', () => {
    expect(audioChapterKeys.all).toEqual(['audio-chapters']);
    expect(audioChapterKeys.lists()).toEqual(['audio-chapters', 'list']);
    expect(audioChapterKeys.list('ver-1')).toEqual(['audio-chapters', 'list', 'ver-1', {}]);
    expect(audioChapterKeys.list('ver-1', { page: 2, limit: 10 })).toEqual([
      'audio-chapters',
      'list',
      'ver-1',
      { page: 2, limit: 10 },
    ]);
    expect(audioChapterKeys.detail('ac-1')).toEqual(['audio-chapters', 'detail', 'ac-1']);
    // Distinct branches don't collide.
    expect(audioChapterKeys.list('ver-1')).not.toEqual(audioChapterKeys.detail('ac-1'));
  });
});

describe('useAudioChapters', () => {
  it('fetches the paginated list', async () => {
    server.use(
      http.get(`${API_BASE}/admin/versions/:id/audio-chapters`, () =>
        HttpResponse.json({
          items: [makeChapter()],
          total: 1,
          page: 1,
          limit: 50,
        })
      )
    );

    const client = createClient();
    const { result } = renderHook(() => useAudioChapters('ver-1'), {
      wrapper: wrapperFor(client),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.items).toHaveLength(1);
    expect(result.current.data?.total).toBe(1);
  });
});

describe('useAudioChapter', () => {
  it('fetches a single chapter when id is provided', async () => {
    server.use(
      http.get(`${API_BASE}/admin/audio-chapters/:id`, ({ params }) =>
        HttpResponse.json(makeChapter({ id: params.id }))
      )
    );

    const client = createClient();
    const { result } = renderHook(() => useAudioChapter('ac-xyz'), {
      wrapper: wrapperFor(client),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.id).toBe('ac-xyz');
  });

  it('is disabled for an empty id', async () => {
    const client = createClient();
    const { result } = renderHook(() => useAudioChapter(''), {
      wrapper: wrapperFor(client),
    });

    // Query never fetches — status remains pending but fetchStatus idle.
    expect(result.current.fetchStatus).toBe('idle');
  });
});

describe('useCreateAudioChapter', () => {
  it('invalidates list queries on success and caches detail', async () => {
    server.use(
      http.post(`${API_BASE}/versions/:id/audio-chapters`, async ({ request }) => {
        const body = (await request.json()) as { title: string };
        return HttpResponse.json(makeChapter({ id: 'ac-new', title: body.title }));
      })
    );

    const client = createClient();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useCreateAudioChapter(), {
      wrapper: wrapperFor(client),
    });

    await act(async () => {
      await result.current.mutateAsync({
        bookVersionId: 'ver-1',
        data: { number: 1, title: 'Fresh', audioUrl: 'https://cdn/x.mp3', duration: 1 },
      });
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: audioChapterKeys.lists() });
    expect(client.getQueryData(audioChapterKeys.detail('ac-new'))).toMatchObject({
      id: 'ac-new',
      title: 'Fresh',
    });
  });

  it('propagates ApiError on 401 through onError', async () => {
    server.use(
      http.post(`${API_BASE}/versions/:id/audio-chapters`, () =>
        HttpResponse.json({ message: 'Unauthorized', error: 'Unauthorized' }, { status: 401 })
      )
    );

    const onError = vi.fn();
    const client = createClient();
    const { result } = renderHook(() => useCreateAudioChapter({ onError }), {
      wrapper: wrapperFor(client),
    });

    await act(async () => {
      await expect(
        result.current.mutateAsync({
          bookVersionId: 'ver-1',
          data: { number: 1, title: 'X', audioUrl: 'https://cdn/x.mp3', duration: 1 },
        })
      ).rejects.toMatchObject({ statusCode: 401 });
    });

    expect(onError).toHaveBeenCalled();
  });
});

describe('useUpdateAudioChapter', () => {
  it('writes the response into the detail cache and invalidates lists', async () => {
    server.use(
      http.patch(`${API_BASE}/audio-chapters/:id`, async ({ params, request }) => {
        const body = (await request.json()) as { title: string };
        return HttpResponse.json(makeChapter({ id: params.id, title: body.title }));
      })
    );

    const client = createClient();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useUpdateAudioChapter(), {
      wrapper: wrapperFor(client),
    });

    await act(async () => {
      await result.current.mutateAsync({
        audioChapterId: 'ac-1',
        data: { title: 'Updated' },
      });
    });

    expect(client.getQueryData(audioChapterKeys.detail('ac-1'))).toMatchObject({
      title: 'Updated',
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: audioChapterKeys.lists() });
  });
});

describe('useDeleteAudioChapter', () => {
  it('removes the detail query and invalidates lists', async () => {
    server.use(
      http.delete(`${API_BASE}/audio-chapters/:id`, () => new HttpResponse(null, { status: 204 }))
    );

    const client = createClient();
    client.setQueryData(audioChapterKeys.detail('ac-1'), makeChapter());
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    const removeSpy = vi.spyOn(client, 'removeQueries');

    const { result } = renderHook(() => useDeleteAudioChapter(), {
      wrapper: wrapperFor(client),
    });

    await act(async () => {
      await result.current.mutateAsync({ audioChapterId: 'ac-1', bookVersionId: 'ver-1' });
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: audioChapterKeys.lists() });
    expect(removeSpy).toHaveBeenCalledWith({ queryKey: audioChapterKeys.detail('ac-1') });
  });
});

describe('useReorderAudioChapters', () => {
  it('invalidates list queries on success', async () => {
    server.use(
      http.post(`${API_BASE}/versions/:id/audio-chapters/reorder`, async ({ request }) => {
        const body = (await request.json()) as { audioChapterIds: string[] };
        return HttpResponse.json(
          body.audioChapterIds.map((id, idx) =>
            makeChapter({ id, number: idx + 1, title: `C ${idx + 1}` })
          )
        );
      })
    );

    const client = createClient();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useReorderAudioChapters(), {
      wrapper: wrapperFor(client),
    });

    await act(async () => {
      const res = await result.current.mutateAsync({
        bookVersionId: 'ver-1',
        data: { audioChapterIds: ['b', 'a'] },
      });
      expect(res.map((c) => c.id)).toEqual(['b', 'a']);
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: audioChapterKeys.lists() });
  });
});
