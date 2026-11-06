import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CONTENT_DRAFT_LOCAL_CODES } from '@/api/hooks/draftKeys';
import {
  ANALYSIS_WRITE_REFETCH_MS,
  analysisWriteKeys,
  analysisWriteRefetchInterval,
  useAnalysisWrite,
  useAnalysisWriteActions,
  useAnalysisWriteEstimate,
  useAnalysisWritesInFlight,
  useAnalysisWriteProposal,
} from '@/api/hooks/useAnalysisWrite';
import { dossierKeys } from '@/api/hooks/useDossier';
import { summaryWriteKeys } from '@/api/hooks/useSummaryWrite';
import type { AnalysisWrite, AnalysisWriteItem, AnalysisWriteState } from '@/types/api-schema';

/**
 * F07-3a: ход анализа перечитывается, пока пишется с идущей операцией или перегенерирует блок;
 * действия перечитывают ход; «Regenerate» сбрасывает прежнее содержимое предложения; перестройка
 * досье сбрасывает ход анализа (`analysis_write`), а не снятую заготовку.
 */

const api = vi.hoisted(() => ({
  acceptAllAnalysisItems: vi.fn(),
  acceptAnalysisItem: vi.fn(),
  discardAnalysisItem: vi.fn(),
  discardAnalysisWriteRun: vi.fn(),
  getAnalysisWrite: vi.fn(),
  getAnalysisWriteEstimate: vi.fn(),
  getAnalysisWriteProposal: vi.fn(),
  regenerateAnalysisItem: vi.fn(),
  startAnalysisWrite: vi.fn(),
}));
vi.mock('@/api/endpoints/admin/analysis-write', () => api);
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

const item = (regen: AnalysisWriteItem['regenOperationStatus'] = null): AnalysisWriteItem => ({
  index: 0,
  target: 'mainIdea',
  step: 3,
  verdict: 'ok',
  remarks: [],
  review: { kind: 'answered', model: 'm' },
  outcome: 'written',
  failedReason: null,
  links: false,
  regenFailedReason: null,
  regenerating: regen !== null,
  regenOperationId: regen !== null ? 'op-2' : null,
  regenOperationStatus: regen,
  regenPauseReason: regen === 'paused' ? 'LIMIT_REACHED' : null,
});

const state = (
  status: AnalysisWrite['status'],
  op: AnalysisWrite['operation']['status'],
  regen: AnalysisWriteItem['regenOperationStatus'] = null
): AnalysisWriteState => ({
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
      createdAt: '2026-11-06T00:00:00.000Z',
      updatedAt: '2026-11-06T00:00:00.000Z',
    },
    stepsTotal: 5,
    owns: [],
    steps: [],
    items: [item(regen)],
    droppedQuotes: [],
    droppedSources: [],
    createdAt: '2026-11-06T00:00:00.000Z',
    updatedAt: '2026-11-06T00:00:00.000Z',
  },
});

describe('analysisWriteRefetchInterval', () => {
  it('polls a run being written with an active operation or a running regeneration', () => {
    expect(analysisWriteRefetchInterval(state('building', 'active'))).toBe(
      ANALYSIS_WRITE_REFETCH_MS
    );
    expect(analysisWriteRefetchInterval(state('ready', 'done', 'active'))).toBe(
      ANALYSIS_WRITE_REFETCH_MS
    );
  });

  it('does not poll a paused run, a paused regeneration, a ready, failed or missing run, or after an error', () => {
    expect(analysisWriteRefetchInterval(state('building', 'paused'))).toBe(false);
    expect(analysisWriteRefetchInterval(state('ready', 'done', 'paused'))).toBe(false);
    expect(analysisWriteRefetchInterval(state('ready', 'done'))).toBe(false);
    expect(analysisWriteRefetchInterval(state('failed', 'failed'))).toBe(false);
    expect(analysisWriteRefetchInterval({ draft: null })).toBe(false);
    expect(analysisWriteRefetchInterval(undefined)).toBe(false);
    expect(analysisWriteRefetchInterval(state('building', 'active'), true)).toBe(false);
  });
});

describe('useAnalysisWriteActions', () => {
  let client: QueryClient;
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const keys = (spy: { mock: { calls: unknown[][] } }) =>
    spy.mock.calls.map(([arg]) => (arg as { queryKey: unknown }).queryKey);

  beforeEach(() => {
    vi.clearAllMocks();
    client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  });

  it('Accept and Accept all re-read every proposal of the run (neighbours are rebuilt), on a 409 too', async () => {
    api.acceptAnalysisItem.mockRejectedValueOnce(new Error('409'));
    api.acceptAllAnalysisItems.mockResolvedValueOnce({});
    client.setQueryData(analysisWriteKeys.proposal('d1', 1), { text: 'a' });
    client.setQueryData(analysisWriteKeys.proposal('d1', 4), { text: 'b' });
    client.setQueryData(analysisWriteKeys.proposal('d2', 1), { text: 'other run' });
    const { result } = renderHook(() => useAnalysisWriteActions('v1'), { wrapper });
    await act(() =>
      result.current.accept.mutateAsync({ id: 'd1', index: 2 }).catch(() => undefined)
    );
    expect(client.getQueryState(analysisWriteKeys.proposal('d1', 1))?.isInvalidated).toBe(true);
    expect(client.getQueryState(analysisWriteKeys.proposal('d1', 4))?.isInvalidated).toBe(true);
    expect(client.getQueryState(analysisWriteKeys.proposal('d2', 1))?.isInvalidated).toBe(false);
    client.setQueryData(analysisWriteKeys.proposal('d1', 1), { text: 'a2' });
    expect(client.getQueryState(analysisWriteKeys.proposal('d1', 1))?.isInvalidated).toBe(false);
    await act(() => result.current.acceptAll.mutateAsync('d1'));
    expect(client.getQueryState(analysisWriteKeys.proposal('d1', 1))?.isInvalidated).toBe(true);
  });

  it('Accept, Accept all and Regenerate count as writes of the version until settled (Save is closed); Discard does not', async () => {
    const pending = () => new Promise<never>(() => undefined);
    api.acceptAnalysisItem.mockImplementationOnce(pending);
    api.acceptAllAnalysisItems.mockImplementationOnce(pending);
    api.regenerateAnalysisItem.mockImplementationOnce(pending);
    api.discardAnalysisItem.mockImplementationOnce(pending);
    api.discardAnalysisWriteRun.mockImplementationOnce(pending);
    const writes = () => client.isMutating({ mutationKey: analysisWriteKeys.writes('v1') });
    const { result } = renderHook(() => useAnalysisWriteActions('v1'), { wrapper });
    act(() => {
      result.current.discardItem.mutate({ id: 'd1', index: 1 });
      result.current.discardRun.mutate('d1');
    });
    await waitFor(() => expect(client.isMutating()).toBe(2));
    expect(writes()).toBe(0);
    act(() => result.current.accept.mutate({ id: 'd1', index: 2 }));
    await waitFor(() => expect(writes()).toBe(1));
    act(() => {
      result.current.acceptAll.mutate('d1');
      result.current.regenerate.mutate({ id: 'd1', index: 3 });
    });
    await waitFor(() => expect(writes()).toBe(3));
    expect(client.isMutating({ mutationKey: analysisWriteKeys.writes('v2') })).toBe(0);
    expect(renderHook(() => useAnalysisWritesInFlight('v1'), { wrapper }).result.current).toBe(
      true
    );
    expect(renderHook(() => useAnalysisWritesInFlight('v2'), { wrapper }).result.current).toBe(
      false
    );
  });

  it('Accept, Discard, Accept all and Discard run post and refresh the run, on a 409 too', async () => {
    api.acceptAnalysisItem.mockRejectedValueOnce(new Error('409'));
    api.discardAnalysisItem.mockResolvedValueOnce({});
    api.acceptAllAnalysisItems.mockResolvedValueOnce({});
    api.discardAnalysisWriteRun.mockResolvedValueOnce({});
    const spy = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useAnalysisWriteActions('v1'), { wrapper });
    await act(() =>
      result.current.accept.mutateAsync({ id: 'd1', index: 2 }).catch(() => undefined)
    );
    await act(() => result.current.discardItem.mutateAsync({ id: 'd1', index: 1 }));
    await act(() => result.current.acceptAll.mutateAsync('d1'));
    await act(() => result.current.discardRun.mutateAsync('d1'));
    expect(api.acceptAnalysisItem).toHaveBeenCalledWith('d1', 2);
    expect(api.discardAnalysisItem).toHaveBeenCalledWith('d1', 1);
    expect(api.acceptAllAnalysisItems).toHaveBeenCalledWith('d1');
    expect(api.discardAnalysisWriteRun).toHaveBeenCalledWith('d1');
    expect(keys(spy)).toEqual([
      analysisWriteKeys.latest('v1'),
      analysisWriteKeys.proposals('d1'),
      analysisWriteKeys.latest('v1'),
      analysisWriteKeys.latest('v1'),
      analysisWriteKeys.proposals('d1'),
      analysisWriteKeys.latest('v1'),
    ]);
  });

  it('Regenerate sends the remark and drops the old content of that proposal only', async () => {
    api.regenerateAnalysisItem.mockResolvedValue({});
    client.setQueryData(analysisWriteKeys.proposal('d1', 1), { text: 'old' });
    client.setQueryData(analysisWriteKeys.proposal('d1', 2), { text: 'other' });
    const { result } = renderHook(() => useAnalysisWriteActions('v1'), { wrapper });
    await act(() =>
      result.current.regenerate.mutateAsync({ id: 'd1', index: 1, remark: 'Shorter' })
    );
    await act(() => result.current.regenerate.mutateAsync({ id: 'd1', index: 1 }));
    expect(api.regenerateAnalysisItem.mock.calls).toEqual([
      ['d1', 1, { remark: 'Shorter' }],
      ['d1', 1, {}],
    ]);
    expect(client.getQueryData(analysisWriteKeys.proposal('d1', 1))).toBeUndefined();
    expect(client.getQueryData(analysisWriteKeys.proposal('d1', 2))).toEqual({ text: 'other' });
  });

  it('Continue resumes the run operation with the new limit', async () => {
    llm.resumeLlmOperation.mockResolvedValueOnce({});
    const { result } = renderHook(() => useAnalysisWriteActions('v1'), { wrapper });
    await act(() => result.current.resume.mutateAsync({ id: 'op-1', limitUsd: '3' }));
    expect(llm.resumeLlmOperation).toHaveBeenCalledWith('op-1', '3');
  });

  it('rebuilding the dossier resets the analysis run (analysis_write) and the summary run of this version', async () => {
    const spy = vi.spyOn(client, 'invalidateQueries');
    client.setQueryData(analysisWriteKeys.estimate('v1'), { stale: true });
    client.setQueryData(analysisWriteKeys.estimate('v2'), { other: true });
    client.setQueryData(summaryWriteKeys.estimate('v1'), { stale: true });
    translation.buildDossier.mockResolvedValueOnce({});
    const { result } = renderHook(() => useAnalysisWriteActions('v1'), { wrapper });
    await act(() => result.current.rebuildDossier.mutateAsync());
    expect(keys(spy)).toEqual([
      analysisWriteKeys.latest('v1'),
      summaryWriteKeys.latest('v1'),
      dossierKeys.version('v1'),
      dossierKeys.estimate('v1'),
    ]);
    expect(client.getQueryData(analysisWriteKeys.estimate('v1'))).toBeUndefined();
    expect(client.getQueryData(summaryWriteKeys.estimate('v1'))).toBeUndefined();
    expect(client.getQueryData(analysisWriteKeys.estimate('v2'))).toEqual({ other: true });
  });
});

describe('useAnalysisWrite: wiring of the queries and the local refusals', () => {
  let client: QueryClient;
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    vi.clearAllMocks();
    client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
  });

  it('start, Continue and Regenerate keep LLM_DISABLED and the like local: no common 5xx toast', async () => {
    api.startAnalysisWrite.mockResolvedValueOnce({});
    llm.resumeLlmOperation.mockResolvedValueOnce({});
    api.regenerateAnalysisItem.mockResolvedValueOnce({});
    const { result } = renderHook(() => useAnalysisWriteActions('v1'), { wrapper });
    await act(() => result.current.start.mutateAsync({}));
    await act(() => result.current.resume.mutateAsync({ id: 'op-1' }));
    await act(() => result.current.regenerate.mutateAsync({ id: 'd1', index: 0 }));
    const metas = client
      .getMutationCache()
      .getAll()
      .map((m) => m.options.meta);
    expect(metas).toEqual([
      CONTENT_DRAFT_LOCAL_CODES,
      CONTENT_DRAFT_LOCAL_CODES,
      CONTENT_DRAFT_LOCAL_CODES,
    ]);
  });

  it('the estimate keeps the same local refusals and is asked only while the window is open', async () => {
    api.getAnalysisWriteEstimate.mockResolvedValue({});
    const { rerender } = renderHook(({ on }) => useAnalysisWriteEstimate('v1', on), {
      wrapper,
      initialProps: { on: false },
    });
    expect(api.getAnalysisWriteEstimate).not.toHaveBeenCalled();
    rerender({ on: true });
    await waitFor(() => expect(api.getAnalysisWriteEstimate).toHaveBeenCalledTimes(1));
    expect(client.getQueryCache().find({ queryKey: analysisWriteKeys.estimate('v1') })?.meta).toBe(
      CONTENT_DRAFT_LOCAL_CODES
    );
  });

  it('start refreshes the run after a refusal too', async () => {
    api.startAnalysisWrite.mockRejectedValueOnce(new Error('409'));
    const spy = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useAnalysisWriteActions('v1'), { wrapper });
    await act(() => result.current.start.mutateAsync({}).catch(() => undefined));
    expect(api.startAnalysisWrite).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls.map(([arg]) => (arg as { queryKey: unknown }).queryKey)).toEqual([
      analysisWriteKeys.latest('v1'),
    ]);
  });

  it('the run is asked only when enabled', async () => {
    api.getAnalysisWrite.mockResolvedValue({ draft: null });
    const { rerender } = renderHook(({ on }) => useAnalysisWrite('v1', on), {
      wrapper,
      initialProps: { on: false },
    });
    expect(api.getAnalysisWrite).not.toHaveBeenCalled();
    rerender({ on: true });
    await waitFor(() => expect(api.getAnalysisWrite).toHaveBeenCalledTimes(1));
  });

  it('the content of a proposal is read again whenever enabled (staleTime 0), not taken from the cache', async () => {
    client = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: Infinity } },
    });
    client.setQueryData(analysisWriteKeys.proposal('d1', 2), { text: 'old' });
    api.getAnalysisWriteProposal.mockResolvedValue({ text: 'new' });
    const { result, rerender } = renderHook(({ on }) => useAnalysisWriteProposal('d1', 2, on), {
      wrapper,
      initialProps: { on: false },
    });
    expect(api.getAnalysisWriteProposal).not.toHaveBeenCalled();
    rerender({ on: true });
    await waitFor(() => expect(api.getAnalysisWriteProposal).toHaveBeenCalledTimes(1));
    expect(api.getAnalysisWriteProposal).toHaveBeenCalledWith('d1', 2);
    await waitFor(() => expect(result.current.data).toEqual({ text: 'new' }));
  });

  it('polling of a run being written stops once a read failed', async () => {
    vi.useFakeTimers();
    try {
      api.getAnalysisWrite
        .mockResolvedValueOnce(state('building', 'active'))
        .mockRejectedValue(new Error('Failed to fetch'));
      renderHook(() => useAnalysisWrite('v1', true), { wrapper });
      await act(() => vi.advanceTimersByTimeAsync(0));
      expect(api.getAnalysisWrite).toHaveBeenCalledTimes(1);
      await act(() => vi.advanceTimersByTimeAsync(ANALYSIS_WRITE_REFETCH_MS));
      expect(api.getAnalysisWrite).toHaveBeenCalledTimes(2);
      await act(() => vi.advanceTimersByTimeAsync(ANALYSIS_WRITE_REFETCH_MS * 3));
      expect(api.getAnalysisWrite).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });
});
