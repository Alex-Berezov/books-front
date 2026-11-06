import { render, screen, waitFor, within } from '@testing-library/react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AnalysisTab } from '@/components/admin/books/AnalysisTab';

/**
 * F07-3a: ядро у admin — один текст, плашка хода «Write Analysis». Настоящие вкладка, её хук
 * и блок хода; подменены только хуки API. Перечень недостающего — предупреждения `core_incomplete`
 * пробы сервера, остальные предупреждения — строкой вкладки без фразы о ядре; отказ пробы —
 * в плашке с повтором.
 */

const api = vi.hoisted(() => ({
  saved: null as unknown,
  probe: vi.fn(),
}));

vi.mock('notistack', () => ({ useSnackbar: () => ({ enqueueSnackbar: vi.fn() }) }));

vi.mock('next/dynamic', async () => {
  const m = await import('@/components/admin/books/AnalysisTab/AnalysisWrite');
  return { default: () => m.AnalysisWrite };
});

vi.mock('@/api/hooks', async () => ({
  ...(await vi.importActual<object>('@/api/hooks/draftKeys')),
  useBookAnalysis: () => ({
    data: api.saved,
    isSuccess: true,
    isLoading: false,
    fetchStatus: 'idle',
    error: null,
    isError: false,
    refetch: vi.fn(),
  }),
  useChapterTitles: () => ({ data: { items: [], pagination: { total: 0 } } }),
  useSaveBookAnalysis: () => ({ mutate: vi.fn(), mutateAsync: api.probe, isPending: false }),
  useVersionDossier: () => ({ data: undefined, isError: false }),
  useBookVersion: () => ({ data: undefined, isError: false }),
  useAnalysisWrite: () => ({ data: { draft: null }, isError: false, refetch: vi.fn() }),
  useAnalysisWritesInFlight: () => false,
  useAnalysisWriteActions: () => {
    const m = () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), reset: vi.fn(), isPending: false });
    return {
      start: { ...m(), error: null },
      resume: m(),
      discardRun: m(),
      regenerate: m(),
      accept: m(),
      discardItem: m(),
      acceptAll: m(),
      rebuildDossier: { ...m(), isSuccess: false, error: null },
    };
  },
  useAnalysisWriteEstimate: () => ({
    data: undefined,
    isError: false,
    error: null,
    isFetching: false,
  }),
  useAnalysisWriteProposal: () => ({ data: undefined, error: null, isError: false }),
  useDossierEstimate: () => ({ data: undefined, isError: false, isFetching: false }),
}));

const version = {
  title: 'T',
  author: 'A',
  language: 'en' as const,
  firstPublishedYear: null,
  characters: null,
  quotes: null,
};

const saved = (hasCore: boolean) => ({
  language: 'en',
  hasCore,
  chapterNumbers: [1],
  facts: null,
  mainIdea: 'Idea',
  themes: null,
  characters: null,
  symbols: null,
  keyQuotes: null,
  titleMeaning: null,
  endingMeaning: null,
  context: null,
  timeline: null,
  style: null,
  reception: null,
  adaptations: null,
  misreadings: null,
  discussionQuestions: null,
  faq: null,
  sources: null,
  createdAt: '2026-11-06T00:00:00.000Z',
  updatedAt: '2026-11-06T00:00:00.000Z',
});

const plate = () =>
  screen.getByRole('region', { name: 'Write Analysis' }).querySelector('[role="status"]');

describe('AnalysisTab + AnalysisWrite: the core at admin (F07-3a)', () => {
  // Модуль проверок грузится лениво (zod): прогрев до тестов.
  beforeAll(async () => {
    await import('@/lib/admin/book-analysis-validation');
  });

  beforeEach(() => {
    vi.clearAllMocks();
    api.saved = saved(false);
  });

  it('no core: the plate lists the core warnings of the probe; the tab shows the rest without a core sentence', async () => {
    api.probe.mockResolvedValue({
      analysis: null,
      hasCore: false,
      warnings: [
        { code: 'core_incomplete', path: 'themes', message: 'themes: 1 of 2' },
        { code: 'chapter_not_found', path: 'themes.0.chapters.0', message: 'chapter 9' },
      ],
    });
    render(<AnalysisTab versionId="v1" version={version} isAdmin lang="en" />);
    await waitFor(() => expect(screen.getByText('themes: 1 of 2')).toBeInTheDocument());
    expect(api.probe).toHaveBeenCalledTimes(1);
    const core = plate() as HTMLElement;
    expect(within(core).getByText(/Core: not ready/)).toBeInTheDocument();
    expect(within(core).getByText('themes: 1 of 2')).toBeInTheDocument();
    expect(within(core).queryByText(/chapter 9/)).toBeNull();
    // Прочее предупреждение — строкой вкладки; второй фразы о ядре нет.
    expect(screen.getByText('themes.0.chapters.0: chapter 9')).toBeInTheDocument();
    expect(screen.queryByText(/Core is incomplete/)).toBeNull();
    expect(screen.queryByText(/Saved analysis has no complete core/)).toBeNull();
    expect(screen.getAllByText('themes: 1 of 2')).toHaveLength(1);
  });

  it('the probe failed: the reason and Retry in the plate, not in a second line of the tab', async () => {
    api.probe.mockRejectedValue(new Error('Failed to fetch'));
    render(<AnalysisTab versionId="v1" version={version} isAdmin lang="en" />);
    await waitFor(() =>
      expect(
        within(plate() as HTMLElement).getByText(/Could not check what is missing: Failed to fetch/)
      ).toBeInTheDocument()
    );
    expect(screen.queryByText(/Could not check what is missing to the core/)).toBeNull();
    expect(within(plate() as HTMLElement).getByRole('button', { name: 'Retry' })).toBeEnabled();
  });

  it('core ready: only «Core: ready», no other core text', async () => {
    api.saved = saved(true);
    render(<AnalysisTab versionId="v1" version={version} isAdmin lang="en" />);
    await waitFor(() => expect(screen.getByText('Core: ready')).toBeInTheDocument());
    expect(screen.queryByText('Saved analysis has a complete core.')).toBeNull();
    expect(api.probe).not.toHaveBeenCalled();
  });
});
