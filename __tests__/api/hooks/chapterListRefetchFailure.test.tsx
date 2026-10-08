/**
 * A save never waits for the chapter list (arbiter 08.10.2026, LEGACY-441): the mutation
 * resolves on its own response, and a failed list refetch afterwards leaves the old list
 * in cache with an error, which the tab shows as a line over the list (LEGACY-440).
 */

import React, { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  audioChapterKeys,
  useAllAudioChapters,
  useCreateAudioChapter,
  useDeleteAudioChapter,
  useReorderAudioChapters,
  useUpdateAudioChapter,
} from '@/api/hooks/useAudioChapters';
import { useCreateChapter, useDeleteChapter, useUpdateChapter } from '@/api/hooks/useChapters';

const mocks = vi.hoisted(() => ({ listAll: vi.fn() }));

vi.mock('@/api/endpoints/admin/chapters', () => ({
  getChapters: vi.fn(),
  createChapter: vi.fn(async () => ({ id: 'c-new', bookVersionId: 'v1', number: 2 })),
  updateChapter: vi.fn(async () => ({ id: 'c1', bookVersionId: 'v1', number: 10 })),
  deleteChapter: vi.fn(async () => undefined),
}));

vi.mock('@/api/endpoints/admin/audioChapters', () => ({
  getAudioChapters: vi.fn(),
  getAllAudioChapters: mocks.listAll,
  getAudioChapter: vi.fn(),
  createAudioChapter: vi.fn(async () => ({ id: 'a-new', bookVersionId: 'v1', number: 2 })),
  updateAudioChapter: vi.fn(async () => ({ id: 'a1', bookVersionId: 'v1', number: 10 })),
  deleteAudioChapter: vi.fn(async () => undefined),
  reorderAudioChapters: vi.fn(async () => []),
}));

const createClient = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

const wrapperFor = (client: QueryClient) => {
  const Wrapper = ({ children }: { children: ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children);
  return Wrapper;
};

const newAudio = { number: 2, title: 'T', audioUrl: 'https://cdn/x.mp3', duration: 1 };

beforeEach(() => {
  mocks.listAll.mockReset();
});

type Run = () => Promise<unknown>;

const mutations: Array<[string, () => Run]> = [
  [
    'useCreateChapter',
    () => {
      const m = useCreateChapter();
      return () => m.mutateAsync({ versionId: 'v1', data: { number: 2, title: 'T', content: '' } });
    },
  ],
  [
    'useUpdateChapter',
    () => {
      const m = useUpdateChapter();
      return () => m.mutateAsync({ chapterId: 'c1', versionId: 'v1', data: { number: 10 } });
    },
  ],
  [
    'useDeleteChapter',
    () => {
      const m = useDeleteChapter();
      return () => m.mutateAsync({ chapterId: 'c1', versionId: 'v1' });
    },
  ],
  [
    'useCreateAudioChapter',
    () => {
      const m = useCreateAudioChapter();
      return () => m.mutateAsync({ bookVersionId: 'v1', data: newAudio });
    },
  ],
  [
    'useUpdateAudioChapter',
    () => {
      const m = useUpdateAudioChapter();
      return () =>
        m.mutateAsync({ audioChapterId: 'a1', bookVersionId: 'v1', data: { number: 10 } });
    },
  ],
  [
    'useDeleteAudioChapter',
    () => {
      const m = useDeleteAudioChapter();
      return () => m.mutateAsync({ audioChapterId: 'a1', bookVersionId: 'v1' });
    },
  ],
  [
    'useReorderAudioChapters',
    () => {
      const m = useReorderAudioChapters();
      return () => m.mutateAsync({ bookVersionId: 'v1', data: { audioChapterIds: [] } });
    },
  ],
];

describe.each(mutations)('%s', (_name, useRun) => {
  it('resolves while the list invalidation never settles', async () => {
    const client = createClient();
    // A list refetch that hangs: a save waiting for it would hang the dialog.
    const invalidateSpy = vi
      .spyOn(client, 'invalidateQueries')
      .mockImplementation(() => new Promise(() => undefined));
    const { result } = renderHook(useRun, { wrapper: wrapperFor(client) });

    await act(async () => {
      await expect(result.current()).resolves.not.toThrow();
    });
    expect(invalidateSpy).toHaveBeenCalledTimes(1);
  });
});

describe('a chapter save and the list refetch', () => {
  it('keeps the old list in cache with an error when the refetch fails (LEGACY-440)', async () => {
    const client = createClient();
    mocks.listAll.mockResolvedValueOnce([{ id: 'a1', number: 1 }]);
    const { result } = renderHook(
      () => ({ list: useAllAudioChapters('v1'), create: useCreateAudioChapter() }),
      { wrapper: wrapperFor(client) }
    );
    await waitFor(() => expect(result.current.list.isSuccess).toBe(true));

    mocks.listAll.mockRejectedValueOnce(new Error('offline'));
    await act(async () => {
      await result.current.create.mutateAsync({ bookVersionId: 'v1', data: newAudio });
    });

    await waitFor(() => expect(result.current.list.error).toBeInstanceOf(Error));
    expect(result.current.list.data).toEqual([{ id: 'a1', number: 1 }]);
    expect(client.getQueryState(audioChapterKeys.listAll('v1'))?.status).toBe('error');
  });
});
