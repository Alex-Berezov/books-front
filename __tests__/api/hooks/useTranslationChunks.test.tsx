import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useDossierGlossary } from '@/api/hooks/useDossier';
import {
  chunksRefetchInterval,
  translationChunkKeys,
  useTranslationChunkActions,
  useTranslationChunks,
} from '@/api/hooks/useTranslationChunks';
import type {
  TranslationChunk,
  TranslationChunkRetry,
  TranslationChunks,
} from '@/types/api-schema';

/**
 * F05-7v-b: опрос кусков, пока идёт повтор или запуск переводит язык; конец повтора фоном
 * и кнопки сбрасывают куски, ход и отчёт запуска; глоссарий без построенного не запрашивается.
 */

const api = vi.hoisted(() => ({
  editTranslationChunk: vi.fn(),
  getDossierGlossary: vi.fn(),
  getTranslationChunks: vi.fn(),
  getVersionDossier: vi.fn(),
  retryTranslationChunk: vi.fn(),
}));
vi.mock('@/api/endpoints/admin/translation', () => api);

const llm = vi.hoisted(() => ({ cancelLlmOperation: vi.fn(), resumeLlmOperation: vi.fn() }));
vi.mock('@/api/endpoints/admin/llm', () => ({
  ...llm,
  LLM_MODELS_UNAVAILABLE: 'LLM_MODELS_UNAVAILABLE',
}));

const retryOf = (
  operationStatus: TranslationChunkRetry['operationStatus']
): TranslationChunkRetry => ({
  operationId: 'op1',
  status: operationStatus === 'active' ? 'pending' : 'applied',
  requestedModel: null,
  model: null,
  reason: null,
  reasonModels: [],
  costUsd: '0',
  operationStatus,
  pauseReason: null,
  spentUsd: '0',
  limitUsd: '1',
});

const chunksWith = (retry: TranslationChunkRetry | null): TranslationChunks => ({
  runId: 'r1',
  language: 'es',
  chapterNumber: 2,
  sourceChanged: false,
  chapter: {
    status: 'written',
    flagReason: null,
    rewriteRefusal: null,
    chapterId: 'ch2',
    findings: [],
  },
  chunks: [{ id: 'c1', retry } as TranslationChunk],
});

const setup = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const invalidate = vi.spyOn(client, 'invalidateQueries');
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const invalidated = () =>
    invalidate.mock.calls.map(([filters]) => JSON.stringify(filters?.queryKey));
  return { client, wrapper, invalidated };
};

const RUN_KEYS = [
  JSON.stringify(['translation-run', 'detail', 'r1']),
  JSON.stringify(['translation-run', 'report', 'r1']),
];

describe('chunksRefetchInterval', () => {
  it('идёт повтор — опрос; на паузе и в итоге — нет', () => {
    expect(chunksRefetchInterval(chunksWith(retryOf('active')))).toBe(5_000);
    expect(chunksRefetchInterval(chunksWith(retryOf('paused')))).toBe(false);
    expect(chunksRefetchInterval(chunksWith(retryOf('done')))).toBe(false);
    expect(chunksRefetchInterval(chunksWith(null))).toBe(false);
  });

  it('запуск переводит язык — опрос и без повтора; отказ запроса — без опроса', () => {
    expect(chunksRefetchInterval(chunksWith(null), false, true)).toBe(5_000);
    expect(chunksRefetchInterval(chunksWith(retryOf('active')), true, true)).toBe(false);
  });
});

describe('Хуки кусков запуска', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('без главы — запроса нет', () => {
    const { wrapper } = setup();
    renderHook(() => useTranslationChunks('r1', 'es', null), { wrapper });
    expect(api.getTranslationChunks).not.toHaveBeenCalled();
  });

  it('повтор дошёл до конца фоном — ход, отчёт и глава черновика сбрасываются', async () => {
    const { client, wrapper, invalidated } = setup();
    client.setQueryData(translationChunkKeys.chapter('r1', 'es', 2), chunksWith(retryOf('active')));
    api.getTranslationChunks.mockResolvedValue(chunksWith(retryOf('done')));

    const { result } = renderHook(() => useTranslationChunks('r1', 'es', 2, false, 'draft-es'), {
      wrapper,
    });
    await act(() => result.current.refetch());

    expect(invalidated()).toEqual(
      expect.arrayContaining([
        ...RUN_KEYS,
        JSON.stringify(['chapters', 'list', 'draft-es']),
        JSON.stringify(['chapters', 'detail', 'ch2']),
      ])
    );
  });

  it('повтор закончился раньше первого опроса — тоже сброс', async () => {
    const { client, wrapper, invalidated } = setup();
    client.setQueryData(translationChunkKeys.chapter('r1', 'es', 2), chunksWith(null));
    api.getTranslationChunks.mockResolvedValue(chunksWith(retryOf('done')));

    const { result } = renderHook(() => useTranslationChunks('r1', 'es', 2), { wrapper });
    await act(() => result.current.refetch());

    expect(invalidated()).toEqual(expect.arrayContaining(RUN_KEYS));
  });

  it('повтор ещё идёт — ход и отчёт не трогаются', async () => {
    const { client, wrapper, invalidated } = setup();
    client.setQueryData(translationChunkKeys.chapter('r1', 'es', 2), chunksWith(retryOf('active')));
    api.getTranslationChunks.mockResolvedValue(chunksWith(retryOf('active')));

    const { result } = renderHook(() => useTranslationChunks('r1', 'es', 2), { wrapper });
    await act(() => result.current.refetch());

    expect(invalidated()).toEqual([]);
  });

  it.each(['retry', 'edit', 'resumeRetry', 'cancelRetry'] as const)(
    '%s — и при отказе — сбрасывает куски, ход и отчёт',
    async (name) => {
      const { wrapper, invalidated } = setup();
      for (const fn of [
        api.retryTranslationChunk,
        api.editTranslationChunk,
        llm.resumeLlmOperation,
        llm.cancelLlmOperation,
      ]) {
        fn.mockRejectedValue(new Error('409'));
      }
      const { result } = renderHook(() => useTranslationChunkActions('r1'), { wrapper });
      const args = {
        retry: { chunkId: 'c1', data: { limitUsd: '1' } },
        edit: { chunkId: 'c1', data: { blocks: [] } },
        resumeRetry: { id: 'op1' },
        cancelRetry: 'op1',
      }[name];

      await act(async () => {
        await (result.current[name].mutateAsync as (v: unknown) => Promise<unknown>)(args).catch(
          () => undefined
        );
      });

      await waitFor(() =>
        expect(invalidated()).toEqual(
          expect.arrayContaining([JSON.stringify(['translation-chunks', 'run', 'r1']), ...RUN_KEYS])
        )
      );
    }
  );

  it('повтор и «продолжить»: 503 ключа и каталога моделей — плашкой формы, без общего тоста', async () => {
    const { client, wrapper } = setup();
    api.retryTranslationChunk.mockRejectedValue(new Error('503'));
    llm.resumeLlmOperation.mockRejectedValue(new Error('503'));
    const { result } = renderHook(() => useTranslationChunkActions('r1'), { wrapper });

    await act(async () => {
      await result.current.retry
        .mutateAsync({ chunkId: 'c1', data: { limitUsd: '1' } })
        .catch(() => undefined);
      await result.current.resumeRetry.mutateAsync({ id: 'op1' }).catch(() => undefined);
    });

    for (const m of client.getMutationCache().getAll()) {
      expect(m.options.meta).toEqual({
        localErrorCodes: ['LLM_DISABLED', 'LLM_MODELS_UNAVAILABLE'],
      });
    }
    expect(client.getMutationCache().getAll()).toHaveLength(2);
  });

  it('правка сбрасывает и главу черновика', async () => {
    const { wrapper, invalidated } = setup();
    api.editTranslationChunk.mockResolvedValue({ chunk: {}, chapterRewritten: true, reason: null });
    const { result } = renderHook(() => useTranslationChunkActions('r1', 'draft-es', 'ch2'), {
      wrapper,
    });

    await act(() => result.current.edit.mutateAsync({ chunkId: 'c1', data: { blocks: [] } }));

    await waitFor(() =>
      expect(invalidated()).toEqual(
        expect.arrayContaining([
          JSON.stringify(['chapters', 'list', 'draft-es']),
          JSON.stringify(['chapters', 'detail', 'ch2']),
        ])
      )
    );
  });

  it('глоссарий не построен — запроса нет', () => {
    const { wrapper } = setup();
    renderHook(() => useDossierGlossary('d1', 'es', false), { wrapper });
    renderHook(() => useDossierGlossary(null, 'es', true), { wrapper });
    expect(api.getDossierGlossary).not.toHaveBeenCalled();
  });
});
