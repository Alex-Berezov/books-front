import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CONTENT_DRAFT_LOCAL_CODES,
  CONTENT_DRAFT_REFETCH_MS,
  contentDraftKeys,
  contentDraftRefetchInterval,
  useContentDraftActions,
} from '@/api/hooks/useContentDraft';
import { dossierKeys } from '@/api/hooks/useDossier';
import type { ContentDraft, ContentDraftState, LlmOperation } from '@/types/api-schema';

/**
 * F05-10: заготовка перечитывается, пока строится и её операция идёт; пауза, отказ, готовность
 * и упавший запрос — без опроса. Кнопки сбрасывают заготовку вида, перестройка — и досье.
 */

const api = vi.hoisted(() => ({
  discardContentDraft: vi.fn(),
  getContentDraft: vi.fn(),
  getContentDraftEstimate: vi.fn(),
  markContentDraftSectionAdded: vi.fn(),
  startContentDraft: vi.fn(),
}));
vi.mock('@/api/endpoints/admin/content-draft', () => api);
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

const state = (status: ContentDraft['status'], op: LlmOperation['status']): ContentDraftState => ({
  draft: { status, operation: { status: op } } as unknown as ContentDraft,
});

describe('contentDraftRefetchInterval', () => {
  it('polls only a building draft with an active operation', () => {
    expect(contentDraftRefetchInterval(state('building', 'active'))).toBe(CONTENT_DRAFT_REFETCH_MS);
    expect(contentDraftRefetchInterval(state('building', 'paused'))).toBe(false);
    expect(contentDraftRefetchInterval(state('ready', 'done'))).toBe(false);
    expect(contentDraftRefetchInterval(state('failed', 'failed'))).toBe(false);
    expect(contentDraftRefetchInterval({ draft: null })).toBe(false);
    expect(contentDraftRefetchInterval(state('building', 'active'), true)).toBe(false);
  });

  it('LLM_DISABLED and LLM_MODELS_UNAVAILABLE are shown by the tab, not by the common toast', () => {
    expect(CONTENT_DRAFT_LOCAL_CODES.localErrorCodes).toEqual([
      'LLM_DISABLED',
      'LLM_MODELS_UNAVAILABLE',
    ]);
  });
});

describe('useContentDraftActions', () => {
  let client: QueryClient;
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    vi.clearAllMocks();
    client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  });

  it('start refreshes the draft of its kind once, also on a refusal', async () => {
    const spy = vi.spyOn(client, 'invalidateQueries');
    api.startContentDraft.mockRejectedValueOnce(new Error('409'));
    const { result } = renderHook(() => useContentDraftActions('v1', 'summary_full'), { wrapper });
    act(() => result.current.start.mutate({}));
    await waitFor(() => expect(result.current.start.isError).toBe(true));
    expect(api.startContentDraft).toHaveBeenCalledTimes(1);
    expect(api.startContentDraft).toHaveBeenCalledWith('v1', 'summary_full', {});
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith({ queryKey: contentDraftKeys.latest('v1', 'summary_full') });
  });

  it('rebuilding the dossier refreshes every draft, the dossier and its estimate', async () => {
    const spy = vi.spyOn(client, 'invalidateQueries');
    // Отказ оценки DOSSIER_STALE в кэше выключенного запроса вернул бы «Rebuild dossier».
    client.setQueryData(contentDraftKeys.estimate('v1', 'summary_sections'), { stale: true });
    translation.buildDossier.mockResolvedValueOnce({});
    const { result } = renderHook(() => useContentDraftActions('v1', 'summary_sections'), {
      wrapper,
    });
    act(() => result.current.rebuildDossier.mutate());
    await waitFor(() => expect(result.current.rebuildDossier.isSuccess).toBe(true));
    expect(translation.buildDossier).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls.map(([arg]) => (arg as { queryKey: unknown }).queryKey)).toEqual([
      contentDraftKeys.all,
      dossierKeys.version('v1'),
      dossierKeys.estimate('v1'),
    ]);
    expect(
      client.getQueryData(contentDraftKeys.estimate('v1', 'summary_sections'))
    ).toBeUndefined();
  });

  it('the added mark refreshes the draft of its kind', async () => {
    const spy = vi.spyOn(client, 'invalidateQueries');
    api.markContentDraftSectionAdded.mockResolvedValueOnce({});
    const { result } = renderHook(() => useContentDraftActions('v1', 'summary_sections'), {
      wrapper,
    });
    await act(() => result.current.markAdded.mutateAsync({ id: 'd1', sectionNumber: 2 }));
    expect(api.markContentDraftSectionAdded).toHaveBeenCalledTimes(1);
    expect(api.markContentDraftSectionAdded).toHaveBeenCalledWith('d1', 2);
    expect(spy).toHaveBeenCalledWith({
      queryKey: contentDraftKeys.latest('v1', 'summary_sections'),
    });
  });
});
