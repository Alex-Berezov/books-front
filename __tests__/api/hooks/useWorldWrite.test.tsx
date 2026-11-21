import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { analysisWriteKeys, CONTENT_DRAFT_LOCAL_CODES } from '@/api/hooks/draftKeys';
import { bookWorldQueryKeys } from '@/api/hooks/useBookWorld';
import { dossierKeys } from '@/api/hooks/useDossier';
import { summaryWriteKeys } from '@/api/hooks/useSummaryWrite';
import {
  WORLD_WRITE_REFETCH_MS,
  useWorldWrite,
  useWorldWriteActions,
  useWorldWriteEstimate,
  useWorldWriteProposal,
  worldWriteKeys,
  worldWriteRefetchInterval,
} from '@/api/hooks/useWorldWrite';
import type { WorldWriteItem, WorldWriteState } from '@/types/api-schema';

/**
 * F08-4b: ход мира перечитывается, пока пишется с идущей операцией или перегенерирует блок;
 * записи хода в мир («Accept», «Accept all», «Regenerate») сбрасывают запросы мира версии;
 * перестройка досье сбрасывает и ход мира.
 */

const api = vi.hoisted(() => ({
  acceptAllWorldItems: vi.fn(),
  acceptWorldItem: vi.fn(),
  discardWorldItem: vi.fn(),
  discardWorldWriteRun: vi.fn(),
  getWorldWrite: vi.fn(),
  getWorldWriteEstimate: vi.fn(),
  getWorldWriteProposal: vi.fn(),
  regenerateWorldItem: vi.fn(),
  startWorldWrite: vi.fn(),
}));
vi.mock('@/api/endpoints/admin/world-write', () => api);
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

const item = (regen: WorldWriteItem['regenOperationStatus'] = null): WorldWriteItem => ({
  index: 0,
  key: 'anna',
  block: 'short',
  step: 1,
  verdict: 'ok',
  remarks: [],
  review: { kind: 'answered', model: 'm' },
  outcome: 'written',
  failedReason: null,
  regenFailedReason: null,
  regenerating: regen !== null,
  regenOperationId: regen !== null ? 'op-2' : null,
  regenOperationStatus: regen,
  regenPauseReason: regen === 'paused' ? 'LIMIT_REACHED' : null,
});

const state = (
  status: 'building' | 'ready' | 'failed',
  op: 'active' | 'paused' | 'done' | 'failed',
  regen: WorldWriteItem['regenOperationStatus'] = null
): WorldWriteState => ({
  draft: {
    id: 'd1',
    bookVersionId: 'v1',
    status,
    language: 'ru',
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
      createdAt: '2026-11-17T00:00:00.000Z',
      updatedAt: '2026-11-17T00:00:00.000Z',
    },
    stepsTotal: 3,
    candidates: [],
    pairs: [],
    leftOut: [],
    pairsOff: null,
    steps: [],
    items: [item(regen)],
    droppedQuotes: [],
    droppedSources: [],
    createdAt: '2026-11-17T00:00:00.000Z',
    updatedAt: '2026-11-17T00:00:00.000Z',
  },
});

describe('worldWriteRefetchInterval', () => {
  it('polls a run being written with an active operation or a running regeneration', () => {
    expect(worldWriteRefetchInterval(state('building', 'active'))).toBe(WORLD_WRITE_REFETCH_MS);
    expect(worldWriteRefetchInterval(state('ready', 'done', 'active'))).toBe(
      WORLD_WRITE_REFETCH_MS
    );
  });

  it('does not poll a paused run, a paused regeneration, a ready, failed or missing run, or after an error', () => {
    expect(worldWriteRefetchInterval(state('building', 'paused'))).toBe(false);
    expect(worldWriteRefetchInterval(state('ready', 'done', 'paused'))).toBe(false);
    expect(worldWriteRefetchInterval(state('ready', 'done'))).toBe(false);
    expect(worldWriteRefetchInterval(state('failed', 'failed'))).toBe(false);
    expect(worldWriteRefetchInterval({ draft: null })).toBe(false);
    expect(worldWriteRefetchInterval(undefined)).toBe(false);
    expect(worldWriteRefetchInterval(state('building', 'active'), true)).toBe(false);
  });
});

describe('useWorldWriteActions', () => {
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

  it('Accept and Accept all re-read every proposal of the run, on a 409 too', async () => {
    api.acceptWorldItem.mockRejectedValueOnce(new Error('409'));
    api.acceptAllWorldItems.mockResolvedValueOnce({});
    client.setQueryData(worldWriteKeys.proposal('d1', 1), { text: 'a' });
    client.setQueryData(worldWriteKeys.proposal('d1', 4), { text: 'b' });
    client.setQueryData(worldWriteKeys.proposal('d2', 1), { text: 'other run' });
    const { result } = renderHook(() => useWorldWriteActions('v1'), { wrapper });
    await act(() =>
      result.current.accept.mutateAsync({ id: 'd1', index: 2 }).catch(() => undefined)
    );
    expect(client.getQueryState(worldWriteKeys.proposal('d1', 1))?.isInvalidated).toBe(true);
    expect(client.getQueryState(worldWriteKeys.proposal('d1', 4))?.isInvalidated).toBe(true);
    expect(client.getQueryState(worldWriteKeys.proposal('d2', 1))?.isInvalidated).toBe(false);
    client.setQueryData(worldWriteKeys.proposal('d1', 1), { text: 'a2' });
    await act(() => result.current.acceptAll.mutateAsync('d1'));
    expect(client.getQueryState(worldWriteKeys.proposal('d1', 1))?.isInvalidated).toBe(true);
  });

  it('writes into the world (Accept, Accept all) reset the world of this version only; Discard, Discard run and Regenerate do not', async () => {
    api.acceptWorldItem.mockResolvedValue({});
    api.acceptAllWorldItems.mockResolvedValue({});
    api.regenerateWorldItem.mockResolvedValue({});
    api.discardWorldItem.mockResolvedValue({});
    api.discardWorldWriteRun.mockResolvedValue({});
    client.setQueryData(bookWorldQueryKeys.list('v1'), { entities: [] });
    client.setQueryData(bookWorldQueryKeys.entity('v1', 'anna'), { entity: {} });
    client.setQueryData(bookWorldQueryKeys.list('v2'), { entities: [] });
    const stale = (key: readonly unknown[]) => client.getQueryState(key)?.isInvalidated;
    const { result } = renderHook(() => useWorldWriteActions('v1'), { wrapper });
    await act(() => result.current.discardItem.mutateAsync({ id: 'd1', index: 1 }));
    await act(() => result.current.discardRun.mutateAsync('d1'));
    // «Regenerate» только ставит задачу: запись пустого блока придёт опросом хода (`useWrittenBlocks`).
    await act(() => result.current.regenerate.mutateAsync({ id: 'd1', index: 3 }));
    expect(stale(bookWorldQueryKeys.list('v1'))).toBe(false);
    expect(stale(bookWorldQueryKeys.entity('v1', 'anna'))).toBe(false);
    expect(api.discardWorldItem).toHaveBeenCalledTimes(1);
    expect(api.discardWorldWriteRun).toHaveBeenCalledTimes(1);
    expect(api.regenerateWorldItem).toHaveBeenCalledTimes(1);
    for (const write of [
      () => result.current.accept.mutateAsync({ id: 'd1', index: 2 }),
      () => result.current.acceptAll.mutateAsync('d1'),
    ]) {
      client.setQueryData(bookWorldQueryKeys.list('v1'), { entities: [] });
      client.setQueryData(bookWorldQueryKeys.entity('v1', 'anna'), { entity: {} });
      await act(write);
      expect(stale(bookWorldQueryKeys.list('v1'))).toBe(true);
      expect(stale(bookWorldQueryKeys.entity('v1', 'anna'))).toBe(true);
    }
    expect(stale(bookWorldQueryKeys.list('v2'))).toBe(false);
    expect(api.acceptWorldItem).toHaveBeenCalledTimes(1);
    expect(api.acceptAllWorldItems).toHaveBeenCalledTimes(1);
  });

  it('Accept, Discard, Accept all and Discard run post and refresh the run, on a 409 too', async () => {
    api.acceptWorldItem.mockRejectedValueOnce(new Error('409'));
    api.discardWorldItem.mockResolvedValueOnce({});
    api.acceptAllWorldItems.mockResolvedValueOnce({});
    api.discardWorldWriteRun.mockResolvedValueOnce({});
    const spy = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useWorldWriteActions('v1'), { wrapper });
    await act(() =>
      result.current.accept
        .mutateAsync({ id: 'd1', index: 2, expectedPrint: 'print-2' })
        .catch(() => undefined)
    );
    await act(() => result.current.discardItem.mutateAsync({ id: 'd1', index: 1 }));
    await act(() => result.current.acceptAll.mutateAsync('d1'));
    await act(() => result.current.discardRun.mutateAsync('d1'));
    expect(api.acceptWorldItem).toHaveBeenCalledTimes(1);
    expect(api.acceptWorldItem).toHaveBeenCalledWith('d1', 2, 'print-2');
    expect(api.discardWorldItem).toHaveBeenCalledTimes(1);
    expect(api.discardWorldItem).toHaveBeenCalledWith('d1', 1);
    expect(api.acceptAllWorldItems).toHaveBeenCalledTimes(1);
    expect(api.acceptAllWorldItems).toHaveBeenCalledWith('d1');
    expect(api.discardWorldWriteRun).toHaveBeenCalledTimes(1);
    expect(api.discardWorldWriteRun).toHaveBeenCalledWith('d1');
    const runKeys = keys(spy).filter((k) => (k as string[])[0] === 'world-write');
    expect(runKeys).toEqual([
      worldWriteKeys.latest('v1'),
      worldWriteKeys.proposals('d1'),
      worldWriteKeys.latest('v1'),
      worldWriteKeys.latest('v1'),
      worldWriteKeys.proposals('d1'),
      worldWriteKeys.latest('v1'),
    ]);
  });

  it('Regenerate sends the remark and drops the old content of that proposal only', async () => {
    api.regenerateWorldItem.mockResolvedValue({});
    client.setQueryData(worldWriteKeys.proposal('d1', 1), { text: 'old' });
    client.setQueryData(worldWriteKeys.proposal('d1', 2), { text: 'other' });
    const { result } = renderHook(() => useWorldWriteActions('v1'), { wrapper });
    await act(() =>
      result.current.regenerate.mutateAsync({ id: 'd1', index: 1, remark: 'Shorter' })
    );
    await act(() => result.current.regenerate.mutateAsync({ id: 'd1', index: 1 }));
    expect(api.regenerateWorldItem).toHaveBeenCalledTimes(2);
    expect(api.regenerateWorldItem.mock.calls).toEqual([
      ['d1', 1, { remark: 'Shorter' }],
      ['d1', 1, {}],
    ]);
    expect(client.getQueryData(worldWriteKeys.proposal('d1', 1))).toBeUndefined();
    expect(client.getQueryData(worldWriteKeys.proposal('d1', 2))).toEqual({ text: 'other' });
  });

  it('Continue resumes the run operation with the new limit', async () => {
    llm.resumeLlmOperation.mockResolvedValueOnce({});
    const { result } = renderHook(() => useWorldWriteActions('v1'), { wrapper });
    await act(() => result.current.resume.mutateAsync({ id: 'op-1', limitUsd: '3' }));
    expect(llm.resumeLlmOperation).toHaveBeenCalledTimes(1);
    expect(llm.resumeLlmOperation).toHaveBeenCalledWith('op-1', '3');
  });

  it('rebuilding the dossier resets the world run and its estimate of this version too', async () => {
    const spy = vi.spyOn(client, 'invalidateQueries');
    client.setQueryData(worldWriteKeys.estimate('v1'), { stale: true });
    client.setQueryData(worldWriteKeys.estimate('v2'), { other: true });
    client.setQueryData(analysisWriteKeys.estimate('v1'), { stale: true });
    client.setQueryData(summaryWriteKeys.estimate('v1'), { stale: true });
    translation.buildDossier.mockResolvedValueOnce({});
    const { result } = renderHook(() => useWorldWriteActions('v1'), { wrapper });
    await act(() => result.current.rebuildDossier.mutateAsync());
    expect(translation.buildDossier).toHaveBeenCalledTimes(1);
    expect(keys(spy)).toEqual([
      analysisWriteKeys.latest('v1'),
      summaryWriteKeys.latest('v1'),
      worldWriteKeys.latest('v1'),
      dossierKeys.version('v1'),
      dossierKeys.estimate('v1'),
    ]);
    expect(client.getQueryData(worldWriteKeys.estimate('v1'))).toBeUndefined();
    expect(client.getQueryData(worldWriteKeys.estimate('v2'))).toEqual({ other: true });
  });
});

describe('useWorldWrite: wiring of the queries and the local refusals', () => {
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
    api.startWorldWrite.mockResolvedValueOnce({});
    llm.resumeLlmOperation.mockResolvedValueOnce({});
    api.regenerateWorldItem.mockResolvedValueOnce({});
    const { result } = renderHook(() => useWorldWriteActions('v1'), { wrapper });
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
    api.getWorldWriteEstimate.mockResolvedValue({});
    const { rerender } = renderHook(({ on }) => useWorldWriteEstimate('v1', on), {
      wrapper,
      initialProps: { on: false },
    });
    expect(api.getWorldWriteEstimate).not.toHaveBeenCalled();
    rerender({ on: true });
    await waitFor(() => expect(api.getWorldWriteEstimate).toHaveBeenCalledTimes(1));
    expect(client.getQueryCache().find({ queryKey: worldWriteKeys.estimate('v1') })?.meta).toBe(
      CONTENT_DRAFT_LOCAL_CODES
    );
  });

  it('start refreshes the run after a refusal too, and does not touch the world', async () => {
    api.startWorldWrite.mockRejectedValueOnce(new Error('409'));
    const spy = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useWorldWriteActions('v1'), { wrapper });
    await act(() => result.current.start.mutateAsync({}).catch(() => undefined));
    expect(api.startWorldWrite).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls.map(([arg]) => (arg as { queryKey: unknown }).queryKey)).toEqual([
      worldWriteKeys.latest('v1'),
    ]);
  });

  it('the run is asked only when enabled', async () => {
    api.getWorldWrite.mockResolvedValue({ draft: null });
    const { rerender } = renderHook(({ on }) => useWorldWrite('v1', on), {
      wrapper,
      initialProps: { on: false },
    });
    expect(api.getWorldWrite).not.toHaveBeenCalled();
    rerender({ on: true });
    await waitFor(() => expect(api.getWorldWrite).toHaveBeenCalledTimes(1));
  });

  it('the content of a proposal is read again whenever enabled (staleTime 0), not taken from the cache', async () => {
    client = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: Infinity } },
    });
    client.setQueryData(worldWriteKeys.proposal('d1', 2), { text: 'old' });
    api.getWorldWriteProposal.mockResolvedValue({ text: 'new' });
    const { result, rerender } = renderHook(({ on }) => useWorldWriteProposal('d1', 2, on), {
      wrapper,
      initialProps: { on: false },
    });
    expect(api.getWorldWriteProposal).not.toHaveBeenCalled();
    rerender({ on: true });
    await waitFor(() => expect(api.getWorldWriteProposal).toHaveBeenCalledTimes(1));
    expect(api.getWorldWriteProposal).toHaveBeenCalledWith('d1', 2);
    await waitFor(() => expect(result.current.data).toEqual({ text: 'new' }));
  });
});
