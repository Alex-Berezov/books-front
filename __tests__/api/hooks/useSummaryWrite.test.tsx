import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { analysisWriteKeys } from '@/api/hooks/draftKeys';
import { summaryKeys } from '@/api/hooks/useBookSummary';
import { dossierKeys } from '@/api/hooks/useDossier';
import {
  SUMMARY_WRITE_REFETCH_MS,
  summaryWriteKeys,
  summaryWriteRefetchInterval,
  useSummaryWriteActions,
} from '@/api/hooks/useSummaryWrite';
import type { SummaryWrite, SummaryWriteItem, SummaryWriteState } from '@/types/api-schema';

/**
 * F06-3: ход перечитывается, пока пишется с идущей операцией или перегенерирует текст; «Accept»,
 * «Accept all» сбрасывают и ход, и пересказ этой версии; «Discard run» — только ход.
 */

const api = vi.hoisted(() => ({
  acceptAllSummaryItems: vi.fn(),
  acceptSummaryItem: vi.fn(),
  discardSummaryItem: vi.fn(),
  discardSummaryWriteRun: vi.fn(),
  getSummaryWrite: vi.fn(),
  getSummaryWriteEstimate: vi.fn(),
  regenerateSummaryItem: vi.fn(),
  startSummaryWrite: vi.fn(),
}));
vi.mock('@/api/endpoints/admin/summary-write', () => api);
const translation = vi.hoisted(() => ({
  buildDossier: vi.fn(),
  getDossierEstimate: vi.fn(),
  getDossierGlossary: vi.fn(),
  getVersionDossier: vi.fn(),
}));
vi.mock('@/api/endpoints/admin/translation', () => translation);
const llm = vi.hoisted(() => ({ resumeLlmOperation: vi.fn() }));
vi.mock('@/api/endpoints/admin/llm', () => ({
  ...llm,
  LLM_MODELS_UNAVAILABLE: 'LLM_MODELS_UNAVAILABLE',
}));

const item = (regenerating: boolean): SummaryWriteItem => ({
  index: 0,
  target: 'section',
  number: 1,
  title: 'A',
  readerChapter: 1,
  html: '<p>x</p>',
  attempt: 1,
  verdict: 'ok',
  remarks: [],
  review: { kind: 'answered', model: 'm' },
  outcome: 'written',
  failedReason: null,
  authorModel: 'a',
  regenFailedReason: null,
  regenerating,
  regenOperationId: regenerating ? 'op-2' : null,
  regenOperationStatus: regenerating ? 'active' : null,
  regenPauseReason: null,
});

const state = (
  status: SummaryWrite['status'],
  op: SummaryWrite['operation']['status'],
  regenerating = false
): SummaryWriteState => ({
  draft: {
    id: 'd1',
    bookVersionId: 'v1',
    status,
    language: 'en',
    failedReason: null,
    waitingFor: null,
    operation: {
      id: 'op-1',
      kind: 'draft',
      status: op,
      pauseReason: op === 'paused' ? 'LIMIT_REACHED' : null,
      bookVersionId: 'v1',
      limitUsd: '2',
      reservedUsd: '0',
      spentUsd: '0',
      createdAt: '2026-11-02T00:00:00.000Z',
      updatedAt: '2026-11-02T00:00:00.000Z',
    },
    plannedSections: 1,
    sectionsDone: 1,
    owns: { sections: true, full: true, brief: true },
    items: [item(regenerating)],
    chapterChanges: [],
    createdAt: '2026-11-02T00:00:00.000Z',
    updatedAt: '2026-11-02T00:00:00.000Z',
  },
});

describe('summaryWriteRefetchInterval', () => {
  it('polls a run being written with an active operation or a running regeneration', () => {
    expect(summaryWriteRefetchInterval(state('building', 'active'))).toBe(SUMMARY_WRITE_REFETCH_MS);
    expect(summaryWriteRefetchInterval(state('building', 'paused'))).toBe(false);
    expect(summaryWriteRefetchInterval(state('ready', 'done'))).toBe(false);
    expect(summaryWriteRefetchInterval(state('ready', 'done', true))).toBe(
      SUMMARY_WRITE_REFETCH_MS
    );
    expect(summaryWriteRefetchInterval(state('failed', 'failed'))).toBe(false);
    expect(summaryWriteRefetchInterval({ draft: null })).toBe(false);
    expect(summaryWriteRefetchInterval(state('building', 'active'), true)).toBe(false);
  });

  it('a paused regeneration is not polled: it waits for «Continue» like a paused run (F06-5c)', () => {
    const paused = state('ready', 'done', true);
    paused.draft!.items[0].regenOperationStatus = 'paused';
    expect(summaryWriteRefetchInterval(paused)).toBe(false);
  });
});

/**
 * Ход и разделы этой версии: список и раскрытые карточки из кэша списка (`summaryKeys.section`).
 * Полный и «Очень кратко» здесь не сбрасываются — их перечитывает форма вкладки одним запросом.
 */
const WITH_FIELDS = [
  summaryWriteKeys.latest('v1'),
  summaryKeys.sections('v1'),
  summaryKeys.section('s1'),
  summaryKeys.section('s2'),
];

describe('useSummaryWriteActions', () => {
  let client: QueryClient;
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const keys = (spy: { mock: { calls: unknown[][] } }) =>
    spy.mock.calls.map(([arg]) => (arg as { queryKey: unknown }).queryKey);

  beforeEach(() => {
    vi.clearAllMocks();
    client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    // Список разделов версии в кэше: раскрытые карточки — его разделы.
    client.setQueryData(summaryKeys.sections('v1'), {
      sections: [
        { id: 's1', number: 1, title: 'A', readerChapter: 1, updatedAt: '' },
        { id: 's2', number: 2, title: 'B', readerChapter: 2, updatedAt: '' },
      ],
    });
  });

  it('Accept posts the item and refreshes the run and the summary of the version', async () => {
    const spy = vi.spyOn(client, 'invalidateQueries');
    api.acceptSummaryItem.mockResolvedValueOnce({});
    const { result } = renderHook(() => useSummaryWriteActions('v1'), { wrapper });
    await act(() => result.current.accept.mutateAsync({ id: 'd1', index: 2 }));
    expect(api.acceptSummaryItem).toHaveBeenCalledTimes(1);
    expect(api.acceptSummaryItem).toHaveBeenCalledWith('d1', 2, {});
    expect(keys(spy)).toEqual(WITH_FIELDS);
  });

  it('Accept on a 409 refreshes the summary too: the field shows what it holds now', async () => {
    const spy = vi.spyOn(client, 'invalidateQueries');
    api.acceptSummaryItem.mockRejectedValueOnce(new Error('409'));
    const { result } = renderHook(() => useSummaryWriteActions('v1'), { wrapper });
    await act(() =>
      result.current.accept
        .mutateAsync({ id: 'd1', index: 2, confirmChapterChange: true })
        .catch(() => undefined)
    );
    expect(api.acceptSummaryItem).toHaveBeenCalledTimes(1);
    expect(api.acceptSummaryItem).toHaveBeenCalledWith('d1', 2, { confirmChapterChange: true });
    expect(keys(spy)).toEqual(WITH_FIELDS);
  });

  it('Accept all refreshes the summary, Discard run only the run; Regenerate sends the remark', async () => {
    api.acceptAllSummaryItems.mockResolvedValueOnce({});
    api.discardSummaryWriteRun.mockResolvedValueOnce({});
    api.regenerateSummaryItem.mockResolvedValue({});
    const { result } = renderHook(() => useSummaryWriteActions('v1'), { wrapper });
    const spy = vi.spyOn(client, 'invalidateQueries');
    await act(() => result.current.acceptAll.mutateAsync('d1'));
    expect(api.acceptAllSummaryItems).toHaveBeenCalledWith('d1');
    expect(keys(spy)).toEqual(WITH_FIELDS);
    spy.mockClear();
    await act(() => result.current.discardRun.mutateAsync('d1'));
    expect(api.discardSummaryWriteRun).toHaveBeenCalledWith('d1');
    // Отбрасывание хода полей не трогает: перечитывается только ход.
    expect(keys(spy)).toEqual([summaryWriteKeys.latest('v1')]);
    spy.mockClear();
    await act(() =>
      result.current.regenerate.mutateAsync({ id: 'd1', index: 1, remark: 'Shorter' })
    );
    await act(() => result.current.regenerate.mutateAsync({ id: 'd1', index: 1 }));
    expect(api.regenerateSummaryItem.mock.calls).toEqual([
      ['d1', 1, { remark: 'Shorter' }],
      ['d1', 1, {}],
    ]);
    // Перегенерация поля не пишет сразу: пересказ не сбрасывается.
    expect(keys(spy)).toEqual([summaryWriteKeys.latest('v1'), summaryWriteKeys.latest('v1')]);
  });

  it('Continue resumes the run operation with the new limit', async () => {
    llm.resumeLlmOperation.mockResolvedValueOnce({});
    const { result } = renderHook(() => useSummaryWriteActions('v1'), { wrapper });
    await act(() => result.current.resume.mutateAsync({ id: 'op-1', limitUsd: '3' }));
    expect(llm.resumeLlmOperation).toHaveBeenCalledWith('op-1', '3');
  });

  it('rebuilding the dossier resets the summary run and the analysis run of this version', async () => {
    const spy = vi.spyOn(client, 'invalidateQueries');
    client.setQueryData(analysisWriteKeys.estimate('v1'), { stale: true });
    client.setQueryData(summaryWriteKeys.estimate('v1'), { stale: true });
    client.setQueryData(summaryWriteKeys.estimate('v2'), { other: true });
    translation.buildDossier.mockResolvedValueOnce({});
    const { result } = renderHook(() => useSummaryWriteActions('v1'), { wrapper });
    await act(() => result.current.rebuildDossier.mutateAsync());
    expect(translation.buildDossier).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls.map(([arg]) => (arg as { queryKey: unknown }).queryKey)).toEqual([
      analysisWriteKeys.latest('v1'),
      summaryWriteKeys.latest('v1'),
      dossierKeys.version('v1'),
      dossierKeys.estimate('v1'),
    ]);
    // Обе оценки этой версии сброшены, чужая версия не тронута.
    expect(client.getQueryData(analysisWriteKeys.estimate('v1'))).toBeUndefined();
    expect(client.getQueryData(summaryWriteKeys.estimate('v1'))).toBeUndefined();
    expect(client.getQueryData(summaryWriteKeys.estimate('v2'))).toEqual({ other: true });
  });
});
