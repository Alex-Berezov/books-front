import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  RUN_HISTORY_PAGE_SIZE,
  translationRunKeys,
  translationRunRefetchInterval,
  useStartTranslationRun,
  useTranslationRun,
  useTranslationRunActions,
  useTranslationRunEstimate,
  useTranslationRunHistory,
  useTranslationRunReport,
  useTranslationSource,
  useVersionTranslationRuns,
} from '@/api/hooks/useTranslationRun';
import type {
  LlmOperation,
  TranslationRun,
  TranslationRunListItem,
  TranslationRunListResponse,
} from '@/types/api-schema';

/**
 * Хуки запуска перевода (F05-7): опрос хода, сброс языков, списков и отчёта после конца
 * запуска и после кнопок, запуск версии по фильтрам сервера, ключ оценки без порядка кликов.
 */

const api = vi.hoisted(() => ({
  cancelTranslationRun: vi.fn(),
  getBookTranslationRuns: vi.fn(),
  getTranslationRun: vi.fn(),
  getTranslationRunEstimate: vi.fn(),
  getTranslationRunReport: vi.fn(),
  getTranslationSource: vi.fn(),
  pauseTranslationRun: vi.fn(),
  resumeTranslationRun: vi.fn(),
  startTranslationRun: vi.fn(),
}));
vi.mock('@/api/endpoints/admin/translation', () => api);

const llm = vi.hoisted(() => ({ cancelLlmOperation: vi.fn(), resumeLlmOperation: vi.fn() }));
vi.mock('@/api/endpoints/admin/llm', () => ({ ...llm, LLM_MODELS_UNAVAILABLE: 'X' }));

const operation = (over: Partial<LlmOperation> = {}): LlmOperation => ({
  id: 'op-run',
  kind: 'translation_run',
  status: 'active',
  pauseReason: null,
  bookVersionId: 'v1',
  limitUsd: '10',
  reservedUsd: '0',
  spentUsd: '0',
  createdAt: '2026-10-24T00:00:00.000Z',
  updatedAt: '2026-10-24T00:00:00.000Z',
  ...over,
});

const run = (over: Partial<TranslationRun> = {}): TranslationRun => ({
  id: 'r1',
  bookVersionId: 'v1',
  sourceLanguage: 'en',
  dossierId: null,
  stageModels: {},
  operation: operation(),
  operations: [],
  languages: [],
  createdAt: '2026-10-24T00:00:00.000Z',
  ...over,
});

const item = (id: string, status: LlmOperation['status']): TranslationRunListItem => ({
  id,
  bookVersionId: 'v1',
  sourceLanguage: 'en',
  languages: ['es'],
  stageModels: {},
  operation: operation({ status }),
  createdAt: '2026-10-24T00:00:00.000Z',
  createdBy: null,
  models: [],
  costUsd: '0.00000000',
  results: [],
});

const page = (items: TranslationRunListItem[]): TranslationRunListResponse => ({
  items,
  pagination: { page: 1, limit: 10, total: items.length, totalPages: 1 },
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

describe('Опрос хода запуска (решение арбитра F05 | F05-7)', () => {
  it('идущий запуск — опрос раз в 5 с', () => {
    expect(translationRunRefetchInterval(run())).toBe(5_000);
  });

  it('запуск на паузе DOSSIER_PAUSED, досье идёт — опрос продолжается', () => {
    expect(
      translationRunRefetchInterval(
        run({
          operation: operation({ status: 'paused', pauseReason: 'DOSSIER_PAUSED' }),
          operations: [operation({ id: 'op-dossier', kind: 'dossier', status: 'active' })],
        })
      )
    ).toBe(5_000);
  });

  it.each(['done', 'cancelled', 'failed', 'paused'] as const)(
    '%s без идущих операций — без опроса',
    (status) => {
      expect(translationRunRefetchInterval(run({ operation: operation({ status }) }))).toBe(false);
    }
  );

  it('отказ запроса — без опроса', () => {
    expect(translationRunRefetchInterval(run(), true)).toBe(false);
  });
});

describe('Хуки запуска перевода', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('запуск закончился по опросу — языки, списки книги и отчёт сбрасываются', async () => {
    const { client, wrapper, invalidated } = setup();
    // Прошлое чтение - идущий запуск: опрос шёл и на этом чтении кончился.
    client.setQueryData(translationRunKeys.detail('r1'), run());
    api.getTranslationRun.mockResolvedValue(run({ operation: operation({ status: 'done' }) }));

    const { result } = renderHook(() => useTranslationRun('r1', 'b1'), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidated()).toEqual(
      expect.arrayContaining([
        JSON.stringify(translationRunKeys.list('b1')),
        JSON.stringify(translationRunKeys.source('v1')),
        JSON.stringify(translationRunKeys.report('r1')),
      ])
    );
  });

  it('стоящий ход, прочитанный заново (открытие страницы), ничего не сбрасывает', async () => {
    const { wrapper, invalidated } = setup();
    api.getTranslationRun.mockResolvedValue(run({ operation: operation({ status: 'done' }) }));

    const { result } = renderHook(() => useTranslationRun('r1', 'b1'), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidated()).toEqual([]);
  });

  it('пауза и «продолжить» запуска шлют свои ручки и сбрасывают ход', async () => {
    const { wrapper, invalidated } = setup();
    api.pauseTranslationRun.mockResolvedValue(run());
    api.resumeTranslationRun.mockResolvedValue(run());

    const { result } = renderHook(() => useTranslationRunActions(run(), 'b1'), { wrapper });
    await act(async () => {
      await result.current.pause.mutateAsync();
      await result.current.resume.mutateAsync({ limitUsd: '4' });
    });

    expect(api.pauseTranslationRun).toHaveBeenCalledTimes(1);
    expect(api.pauseTranslationRun).toHaveBeenCalledWith('r1');
    expect(api.resumeTranslationRun).toHaveBeenCalledWith('r1', { limitUsd: '4' });
    expect(
      invalidated().filter((k) => k === JSON.stringify(translationRunKeys.detail('r1')))
    ).toHaveLength(2);
  });

  it('языки версии не запрашиваются, пока хук выключен (не admin)', () => {
    const { wrapper } = setup();
    renderHook(() => useTranslationSource('v1', false), { wrapper });

    expect(api.getTranslationSource).not.toHaveBeenCalled();
  });

  it('отчёт идущего запуска перечитывается, пока окно открыто', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const { wrapper } = setup();
      api.getTranslationRunReport.mockResolvedValue({ id: 'r1' });

      const { result } = renderHook(() => useTranslationRunReport('r1', true), { wrapper });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      await act(async () => {
        await vi.advanceTimersByTimeAsync(5_000);
      });

      expect(api.getTranslationRunReport).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('отчёт перечитывается на каждом открытии окна', async () => {
    const { wrapper } = setup();
    api.getTranslationRunReport.mockResolvedValue({ id: 'r1' });

    const first = renderHook(() => useTranslationRunReport('r1'), { wrapper });
    await waitFor(() => expect(first.result.current.isSuccess).toBe(true));
    first.unmount();
    const second = renderHook(() => useTranslationRunReport('r1'), { wrapper });
    await waitFor(() => expect(api.getTranslationRunReport).toHaveBeenCalledTimes(2));
    second.unmount();
  });

  it('идущий запуск по опросу ничего не сбрасывает', async () => {
    const { wrapper, invalidated } = setup();
    api.getTranslationRun.mockResolvedValue(run());

    const { result } = renderHook(() => useTranslationRun('r1', 'b1'), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidated()).toEqual([]);
  });

  it('отмена и «продолжить» операции досье — ход, отчёт, списки и языки сбрасываются и при отказе', async () => {
    const { wrapper, invalidated } = setup();
    api.cancelTranslationRun.mockRejectedValue(new Error('409'));
    llm.resumeLlmOperation.mockResolvedValue(operation());

    const { result } = renderHook(() => useTranslationRunActions(run(), 'b1'), { wrapper });
    await act(async () => {
      await result.current.cancel.mutateAsync().catch(() => undefined);
    });
    expect(invalidated()).toEqual(
      expect.arrayContaining([
        JSON.stringify(translationRunKeys.detail('r1')),
        JSON.stringify(translationRunKeys.report('r1')),
        JSON.stringify(translationRunKeys.list('b1')),
        JSON.stringify(translationRunKeys.source('v1')),
      ])
    );

    await act(async () => {
      await result.current.resumeOperation.mutateAsync({ id: 'op-d', limitUsd: '3' });
    });
    expect(llm.resumeLlmOperation).toHaveBeenCalledWith('op-d', '3');
  });

  it('старт кладёт ход в кэш и сбрасывает списки, языки и оценку версии', async () => {
    const { client, wrapper, invalidated } = setup();
    const started = run({ id: 'r9' });
    api.startTranslationRun.mockResolvedValue(started);

    const { result } = renderHook(() => useStartTranslationRun('v1', 'b1'), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ languages: ['es'] });
    });

    expect(client.getQueryData(translationRunKeys.detail('r9'))).toEqual(started);
    expect(invalidated()).toEqual(
      expect.arrayContaining([
        JSON.stringify(translationRunKeys.list('b1')),
        JSON.stringify(translationRunKeys.source('v1')),
        JSON.stringify(translationRunKeys.estimates('v1')),
      ])
    );
  });

  it('запуски версии: все идущие, и последний закончившийся рядом с ними — его отчёт и черновик', async () => {
    const { wrapper } = setup();
    api.getBookTranslationRuns.mockImplementation((_: string, params: { active?: boolean }) =>
      Promise.resolve(
        params.active
          ? page([item('live-es', 'paused'), item('live-fr', 'active')])
          : page([item('done-ru', 'done')])
      )
    );

    const { result } = renderHook(() => useVersionTranslationRuns('b1', 'v1'), { wrapper });
    await waitFor(() =>
      expect(result.current.runs.map((r) => r.id)).toEqual(['live-es', 'live-fr', 'done-ru'])
    );
    expect(api.getBookTranslationRuns).toHaveBeenCalledWith('b1', {
      bookVersionId: 'v1',
      active: true,
      limit: 5,
    });
    expect(api.getBookTranslationRuns).toHaveBeenCalledWith('b1', {
      bookVersionId: 'v1',
      limit: 1,
    });
  });

  it('последний — тот же, что идущий: не дублируется', async () => {
    const { wrapper } = setup();
    api.getBookTranslationRuns.mockResolvedValue(page([item('live-es', 'active')]));

    const { result } = renderHook(() => useVersionTranslationRuns('b1', 'v1'), { wrapper });
    await waitFor(() => expect(result.current.runs.map((r) => r.id)).toEqual(['live-es']));
  });

  it('отказ «последнего» при идущих не прячет их; при пустых идущих — виден', async () => {
    const { wrapper } = setup();
    api.getBookTranslationRuns.mockImplementation((_: string, params: { active?: boolean }) =>
      params.active
        ? Promise.resolve(page([item('live-es', 'active')]))
        : Promise.reject(new Error('x'))
    );

    const { result } = renderHook(() => useVersionTranslationRuns('b1', 'v1'), { wrapper });
    await waitFor(() => expect(result.current.runs.map((r) => r.id)).toEqual(['live-es']));
    expect(result.current.error).toBeNull();
  });

  it('оценка: порядок выбора языков не меняет запрос; пустой выбор не запрашивает', async () => {
    const { wrapper } = setup();
    api.getTranslationRunEstimate.mockResolvedValue({});

    const { rerender } = renderHook(
      ({ languages }: { languages: Array<'es' | 'fr'> }) =>
        useTranslationRunEstimate('v1', languages.length ? { languages } : null),
      { wrapper, initialProps: { languages: [] as Array<'es' | 'fr'> } }
    );
    expect(api.getTranslationRunEstimate).not.toHaveBeenCalled();

    rerender({ languages: ['fr', 'es'] });
    await waitFor(() => expect(api.getTranslationRunEstimate).toHaveBeenCalledTimes(1));
    rerender({ languages: ['es', 'fr'] });

    expect(api.getTranslationRunEstimate).toHaveBeenCalledTimes(1);
    expect(api.getTranslationRunEstimate).toHaveBeenCalledWith('v1', { languages: ['es', 'fr'] });
  });

  it('история версии (F05-8): все запуски страницами по 10 без фильтра «идущие», без опроса; сброс списков книги перечитывает её', async () => {
    const { wrapper, client } = setup();
    api.getBookTranslationRuns.mockResolvedValue(page([item('old', 'cancelled')]));

    const { result, rerender } = renderHook(
      ({ p }: { p: number }) => useTranslationRunHistory('b1', 'v1', p),
      { wrapper, initialProps: { p: 1 } }
    );
    await waitFor(() => expect(result.current.data?.items.map((r) => r.id)).toEqual(['old']));
    expect(RUN_HISTORY_PAGE_SIZE).toBe(10);
    expect(api.getBookTranslationRuns).toHaveBeenLastCalledWith('b1', {
      bookVersionId: 'v1',
      page: 1,
      limit: RUN_HISTORY_PAGE_SIZE,
    });
    // Без опроса: ход идущих перечитывает блок хода, а история — только по сбросу.
    const query = client
      .getQueryCache()
      .find({ queryKey: translationRunKeys.history('b1', 'v1', 1) });
    expect(query?.options).not.toHaveProperty('refetchInterval');

    rerender({ p: 2 });
    await waitFor(() =>
      expect(api.getBookTranslationRuns).toHaveBeenLastCalledWith('b1', {
        bookVersionId: 'v1',
        page: 2,
        limit: RUN_HISTORY_PAGE_SIZE,
      })
    );
    api.getBookTranslationRuns.mockClear();
    await act(() => client.invalidateQueries({ queryKey: translationRunKeys.list('b1') }));
    // Сброс списков книги перечитывает открытую страницу истории — вторую, один раз.
    await waitFor(() => expect(api.getBookTranslationRuns).toHaveBeenCalledTimes(1));
    expect(api.getBookTranslationRuns).toHaveBeenCalledWith('b1', {
      bookVersionId: 'v1',
      page: 2,
      limit: RUN_HISTORY_PAGE_SIZE,
    });
  });
});
