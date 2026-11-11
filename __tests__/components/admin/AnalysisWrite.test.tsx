import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AnalysisWrite,
  type AnalysisCoreState,
} from '@/components/admin/books/AnalysisTab/AnalysisWrite';
import { ApiError } from '@/types/api';
import type {
  AnalysisWrite as AnalysisWriteRun,
  AnalysisWriteItem,
  AnalysisWriteStep,
  AnalysisWriteValue,
  BookAnalysisDetail,
  LlmOperation,
} from '@/types/api-schema';

/**
 * F07-3a: ход «Write Analysis» во вкладке Analysis — плашка ядра по живому `hasCore` и перечню
 * сервера, отметки проверки моделью без `CORE_MISSING`, «Verify facts» с источниками, «Accept»
 * только по свежему содержимому и 409 со свежими данными, «Regenerate» с замечанием, «Accept all»
 * с пропущенными пунктами, ход по шагам и выброшенное у шага, перечитывание формы по записям
 * хода. Хуки подменены; правила хода и коды — настоящие.
 */

const mutation = () => ({
  mutate: vi.fn(),
  mutateAsync: vi.fn().mockResolvedValue({}),
  reset: vi.fn(),
  isPending: false,
  isSuccess: false,
  error: null as unknown,
  variables: undefined as unknown,
});

const hooks = vi.hoisted(() => ({
  run: null as unknown,
  runError: false,
  refetch: (() => undefined) as () => unknown,
  analysis: null as unknown,
  analysisError: false,
  proposals: {} as Record<number, unknown>,
  /** Номера, содержимое которых сейчас перечитывается (в кэше — прежнее). */
  fetching: [] as number[],
  proposalErrors: {} as Record<number, unknown>,
  proposalEnabled: [] as Array<[number, boolean]>,
  estimate: undefined as unknown,
  actions: {} as Record<string, unknown>,
}));

vi.mock('@/api/hooks', async () => ({
  ...(await vi.importActual<object>('@/api/hooks/draftKeys')),
  useAnalysisWrite: () => ({
    data: hooks.runError ? undefined : { draft: hooks.run },
    isError: hooks.runError,
    refetch: hooks.refetch,
  }),
  useAnalysisWriteActions: () => hooks.actions,
  useAnalysisWriteEstimate: (_v: string, enabled: boolean) => ({
    data: enabled ? hooks.estimate : undefined,
    isError: false,
    error: null,
    isFetching: false,
  }),
  useAnalysisWriteProposal: (_run: string, index: number, enabled: boolean) => {
    hooks.proposalEnabled.push([index, enabled]);
    const error = enabled ? (hooks.proposalErrors[index] ?? null) : null;
    return {
      data: enabled ? hooks.proposals[index] : undefined,
      error,
      isError: error !== null,
      isFetching: enabled && hooks.fetching.includes(index),
    };
  },
  useBookAnalysis: () => ({
    data: hooks.analysisError ? undefined : hooks.analysis,
    isError: hooks.analysisError,
  }),
  useDossierEstimate: () => ({ data: undefined, isError: false, isFetching: false }),
}));

type Mutation = ReturnType<typeof mutation>;
const actions = () =>
  hooks.actions as Record<
    | 'start'
    | 'resume'
    | 'discardRun'
    | 'regenerate'
    | 'accept'
    | 'discardItem'
    | 'acceptAll'
    | 'rebuildDossier',
    Mutation
  >;

const operation = (patch: Partial<LlmOperation> = {}): LlmOperation => ({
  id: 'op-1',
  kind: 'draft',
  status: 'done',
  pauseReason: null,
  bookVersionId: 'v1',
  limitUsd: '2',
  reservedUsd: '0',
  spentUsd: '0.5',
  createdAt: '2026-11-06T00:00:00.000Z',
  updatedAt: '2026-11-06T00:00:00.000Z',
  ...patch,
});

const item = (patch: Partial<AnalysisWriteItem> = {}): AnalysisWriteItem => ({
  index: 0,
  target: 'mainIdea',
  step: 3,
  verdict: 'ok',
  remarks: [],
  review: { kind: 'answered', model: 'openai/gpt-6-luna' },
  outcome: 'proposed',
  failedReason: null,
  links: false,
  regenFailedReason: null,
  regenerating: false,
  regenOperationId: null,
  regenOperationStatus: null,
  regenPauseReason: null,
  ...patch,
});

const step = (patch: Partial<AnalysisWriteStep> = {}): AnalysisWriteStep => ({
  step: 1,
  verdict: 'ok',
  remarks: [],
  attempt: 1,
  outcome: 'done',
  failedReason: null,
  authorModel: 'a',
  review: { kind: 'answered', model: 'm' },
  source: 'text',
  dropped: [],
  ...patch,
});

const run = (patch: Partial<AnalysisWriteRun> = {}): AnalysisWriteRun => ({
  id: 'd1',
  bookVersionId: 'v1',
  status: 'ready',
  language: 'en',
  failedReason: null,
  waitingFor: null,
  operation: operation(),
  stepsTotal: 5,
  owns: [],
  steps: [],
  items: [item()],
  droppedQuotes: [],
  droppedSources: [],
  createdAt: '2026-11-06T00:00:00.000Z',
  updatedAt: '2026-11-06T00:00:00.000Z',
  ...patch,
});

const analysis = (patch: Partial<BookAnalysisDetail> = {}): BookAnalysisDetail => ({
  language: 'en',
  hasCore: false,
  chapterNumbers: [1],
  facts: null,
  mainIdea: null,
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
  ...patch,
});

const value = (patch: Partial<AnalysisWriteValue> = {}): AnalysisWriteValue => ({
  print: 'print-1',
  text: null,
  characters: null,
  keyQuotes: null,
  style: null,
  themes: null,
  symbols: null,
  misreadings: null,
  discussionQuestions: null,
  faq: null,
  timeline: null,
  adaptations: null,
  sources: null,
  ...patch,
});

const coreMissingRemark = {
  code: 'CORE_MISSING' as const,
  where: 'step 3',
  note: 'Core: 1 of 2 themes',
  by: 'code' as const,
};

const onBlocksWritten = vi.fn();
const retryCore = vi.fn();
const core = (patch: Partial<AnalysisCoreState> = {}): AnalysisCoreState => ({
  hasCore: false,
  missing: [],
  error: null,
  checking: false,
  retry: retryCore,
  ...patch,
});
let coreState = core();
let saving = false;
const element = (versionId = 'v1') => (
  <AnalysisWrite
    versionId={versionId}
    lang="en"
    onBlocksWritten={onBlocksWritten}
    core={coreState}
    saving={saving}
  />
);
const view = () => render(element());
const card = (name: string) => screen.getByRole('article', { name });
const button = (name: string) => screen.getByRole('button', { name });

describe('AnalysisWrite (F07-3a)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hooks.run = run();
    hooks.runError = false;
    hooks.refetch = vi.fn();
    hooks.analysis = analysis();
    hooks.analysisError = false;
    // Предложение по умолчанию загружено: «Accept» доступна только по свежему содержимому.
    hooks.proposals = { 0: value({ text: 'Proposed idea' }) };
    hooks.fetching = [];
    hooks.proposalErrors = {};
    hooks.proposalEnabled = [];
    hooks.estimate = undefined;
    coreState = core();
    saving = false;
    hooks.actions = {
      start: mutation(),
      resume: mutation(),
      discardRun: mutation(),
      regenerate: mutation(),
      accept: mutation(),
      discardItem: mutation(),
      acceptAll: mutation(),
      rebuildDossier: mutation(),
    };
  });

  describe('core plate', () => {
    it('by the live hasCore of the saved analysis, not by the CORE_MISSING flag of the step', () => {
      coreState = core({ hasCore: true });
      hooks.run = run({
        steps: [step({ step: 3, verdict: 'flags', remarks: [coreMissingRemark] })],
        items: [item({ remarks: [coreMissingRemark] })],
      });
      view();
      expect(screen.getByText('Core: ready')).toBeInTheDocument();
      expect(screen.queryByText(/Core: not ready/)).toBeNull();
      // Флаг момента шага не идёт ни в плашку, ни в счётчик (решение `F07 | F07-3`, п.6).
      const c = card('Main idea');
      expect(within(c).getByText('Model check: OK')).toBeInTheDocument();
      expect(within(c).queryByText(/Model flags/)).toBeNull();
    });

    it('no core: what is missing — the server warnings, not a count of its own', () => {
      coreState = core({
        missing: [
          { code: 'core_incomplete', path: 'themes', message: 'themes: 1 of 2' },
          { code: 'core_incomplete', path: 'keyQuotes', message: 'keyQuotes: 0 of 3' },
        ],
      });
      hooks.run = run({ items: [] });
      view();
      const plate = screen.getByText(/Core: not ready/).closest('div') as HTMLElement;
      expect(within(plate).getByText('themes: 1 of 2')).toBeInTheDocument();
      expect(within(plate).getByText('keyQuotes: 0 of 3')).toBeInTheDocument();
    });

    it('no core, the check of the saved analysis failed: the reason and Retry; still checking — says so', () => {
      coreState = core({ missing: null, error: 'Failed to fetch' });
      hooks.run = run({ items: [] });
      const { rerender } = view();
      expect(
        screen.getByText(/Could not check what is missing: Failed to fetch/)
      ).toBeInTheDocument();
      fireEvent.click(button('Retry'));
      expect(retryCore).toHaveBeenCalledTimes(1);
      coreState = core({ missing: null, checking: true });
      rerender(element());
      expect(screen.getByText('Core: not ready — checking what is missing…')).toBeInTheDocument();
      // Проба не идёт: не «проверяем», а кнопка (T174, п.4).
      coreState = core({ missing: null });
      rerender(element());
      expect(screen.queryByText(/checking what is missing/)).toBeNull();
      fireEvent.click(button('Check what is missing'));
      expect(retryCore).toHaveBeenCalledTimes(2);
    });

    it('Accept of a core block reloads the analysis: the plate turns ready', async () => {
      const { rerender } = view();
      expect(screen.getByText(/Core: not ready/)).toBeInTheDocument();
      fireEvent.click(within(card('Main idea')).getByRole('button', { name: 'Accept' }));
      await waitFor(() => expect(onBlocksWritten).toHaveBeenCalledTimes(1));
      expect(actions().accept.mutateAsync).toHaveBeenCalledTimes(1);
      expect(actions().accept.mutateAsync).toHaveBeenCalledWith({
        id: 'd1',
        index: 0,
        expectedPrint: 'print-1',
      });
      // Вкладка перечитала анализ (`reloadBlocks`): плашка берёт свежий `hasCore`.
      coreState = core({ hasCore: true });
      rerender(element());
      expect(screen.getByText('Core: ready')).toBeInTheDocument();
    });
  });

  it('model flags: the count without CORE_MISSING, the list and «checked by the model»', () => {
    hooks.run = run({
      items: [
        item({
          verdict: 'flags',
          remarks: [
            coreMissingRemark,
            { code: 'GENERIC', where: 'mainIdea', note: 'True of any book', by: 'model' },
          ],
        }),
      ],
    });
    view();
    const c = card('Main idea');
    expect(within(c).getByText('Model flags (1)')).toBeInTheDocument();
    expect(within(c).getByText(/mainIdea: True of any book \(model\)/)).toBeInTheDocument();
    expect(within(c).queryByText(/Core: 1 of 2 themes/)).toBeNull();
    expect(within(c).getByText('Checked by the model, not by a human.')).toBeInTheDocument();
  });

  describe('external blocks of step 5', () => {
    it('a written block: «Verify facts» and the sources saved in the analysis, named so', () => {
      hooks.analysis = analysis({
        sources: [{ title: 'Britannica', url: 'https://www.britannica.com/book' }],
      });
      hooks.run = run({ items: [item({ target: 'context', step: 5, outcome: 'written' })] });
      view();
      const c = card('Context');
      expect(within(c).getByText(/Verify facts/)).toBeInTheDocument();
      expect(
        within(c).getByText(
          'Sources saved in the analysis (they may include sources added by hand):'
        )
      ).toBeInTheDocument();
      expect(within(c).getByRole('link', { name: 'Britannica' })).toHaveAttribute(
        'href',
        'https://www.britannica.com/book'
      );
      // Записанный блок — не предложение: содержимое предложения не запрашивается.
      expect(hooks.proposalEnabled).toContainEqual([0, false]);
    });

    it('a regenerated proposal: the block and its own sources from items/:index', () => {
      hooks.analysis = analysis({ sources: [{ title: 'Old', url: 'https://old.example/a' }] });
      hooks.proposals[0] = value({
        text: 'Written in 1866 in exile.',
        sources: [{ title: 'New source', url: 'https://new.example/b' }],
      });
      hooks.run = run({ items: [item({ target: 'context', step: 5 })] });
      view();
      const c = card('Context');
      expect(within(c).getByText('Written in 1866 in exile.')).toBeInTheDocument();
      expect(within(c).getByText('Verified sources of this proposal:')).toBeInTheDocument();
      expect(within(c).getByRole('link', { name: 'New source' })).toHaveAttribute(
        'href',
        'https://new.example/b'
      );
      expect(within(c).queryByRole('link', { name: 'Old' })).toBeNull();
    });

    it('a proposal without own sources: the sources of this run (its Sources proposal), not the saved ones', () => {
      hooks.analysis = analysis({ sources: [{ title: 'By hand', url: 'https://hand.example/a' }] });
      hooks.proposals[0] = value({ text: 'Context text.' });
      hooks.proposals[1] = value({
        sources: [{ title: 'Run source', url: 'https://run.example/b' }],
      });
      hooks.run = run({
        items: [
          item({ index: 0, target: 'context', step: 5 }),
          item({ index: 1, target: 'sources', step: 5 }),
        ],
      });
      view();
      const c = card('Context');
      expect(
        within(c).getByText('Sources verified by this run (the Sources proposal, not saved yet):')
      ).toBeInTheDocument();
      expect(within(c).getByRole('link', { name: 'Run source' })).toBeInTheDocument();
      expect(within(c).queryByRole('link', { name: 'By hand' })).toBeNull();
      // У самого блока `sources` — один список.
      const sources = card('Sources');
      expect(within(sources).getAllByRole('list')).toHaveLength(1);
      expect(within(sources).getByRole('link', { name: 'Run source' })).toBeInTheDocument();
    });

    it('the sources of this run are read once for the run and stay on screen while read again', () => {
      hooks.proposals[0] = value({ text: 'Context text.' });
      hooks.proposals[1] = value({
        sources: [{ title: 'Run source', url: 'https://run.example/b' }],
      });
      hooks.proposals[2] = value({ text: 'Reception text.' });
      // Фоновое перечитывание после «Accept» соседа: данные в кэше есть.
      hooks.fetching = [1];
      hooks.run = run({
        items: [
          item({ index: 0, target: 'context', step: 5 }),
          item({ index: 1, target: 'sources', step: 5 }),
          item({ index: 2, target: 'reception', step: 5 }),
        ],
      });
      view();
      for (const name of ['Context', 'Reception']) {
        const c = card(name);
        expect(within(c).getByRole('link', { name: 'Run source' })).toBeInTheDocument();
        expect(within(c).queryByText('Loading the sources of this run…')).toBeNull();
      }
      // Источники хода спрашивает один ход, а не каждая карточка шага 5: подписок на номер 1 —
      // две (ход и содержимое самой карточки `sources`), а не по одной на Context и Reception.
      expect(hooks.proposalEnabled.filter(([i, on]) => i === 1 && on)).toHaveLength(2);
    });

    it('the sources of this run failed to load — says so, the saved ones are not shown instead', () => {
      hooks.analysis = analysis({ sources: [{ title: 'By hand', url: 'https://hand.example/a' }] });
      hooks.proposals[0] = value({ text: 'Context text.' });
      hooks.proposals[1] = undefined;
      hooks.proposalErrors[1] = new Error('Failed to fetch');
      hooks.run = run({
        items: [
          item({ index: 0, target: 'context', step: 5 }),
          item({ index: 1, target: 'sources', step: 5 }),
        ],
      });
      view();
      const c = card('Context');
      expect(within(c).getByText('Could not load the sources of this run.')).toBeInTheDocument();
      expect(within(c).queryByRole('link', { name: 'By hand' })).toBeNull();
    });

    it('the saved analysis failed to load — says so, not «no sources»', () => {
      hooks.analysisError = true;
      hooks.run = run({ items: [item({ target: 'context', step: 5, outcome: 'written' })] });
      view();
      const c = card('Context');
      expect(
        within(c).getByText('Could not load the sources saved in the analysis.')
      ).toBeInTheDocument();
      expect(within(c).queryByText(/No sources are saved/)).toBeNull();
    });

    it('a block of step 3 has no «Verify facts»', () => {
      view();
      expect(within(card('Main idea')).queryByText(/Verify facts/)).toBeNull();
    });
  });

  describe('the content of a proposal', () => {
    it('being read again (after Regenerate) — the old content is hidden and Accept is closed', () => {
      hooks.proposals[0] = value({ text: 'Old proposal' });
      hooks.fetching = [0];
      view();
      const c = card('Main idea');
      expect(within(c).queryByText('Old proposal')).toBeNull();
      expect(within(c).getByText('Loading the proposal…')).toBeInTheDocument();
      expect(within(c).getByRole('button', { name: 'Accept' })).toBeDisabled();
    });

    it('failed to load — the reason, Accept is closed', () => {
      hooks.proposals[0] = undefined;
      hooks.proposalErrors[0] = new ApiError({
        statusCode: 409,
        message: 'not proposed',
        data: { code: 'ANALYSIS_ITEM_NOT_PROPOSED' },
      });
      view();
      const c = card('Main idea');
      expect(
        within(c).getByText(
          'Could not load the proposal: This block is no longer a proposal: reload the tab.'
        )
      ).toBeInTheDocument();
      expect(within(c).getByRole('button', { name: 'Accept' })).toBeDisabled();
    });
  });

  it('nothing to add (none without a reason) — neutral, no refusal and no model check', () => {
    hooks.run = run({
      items: [item({ target: 'characters', links: true, outcome: 'none', failedReason: null })],
    });
    view();
    const c = card('Theme links in characters');
    expect(within(c).getByText('Nothing to add.')).toBeInTheDocument();
    expect(within(c).queryByText(/Not written/)).toBeNull();
    expect(within(c).queryByText(/Model check/)).toBeNull();
  });

  it('not written with a reason — the reason in red', () => {
    hooks.run = run({
      items: [item({ target: 'themes', outcome: 'none', failedReason: 'IMPORT_INVALID' })],
    });
    view();
    expect(
      within(card('Themes')).getByText(
        'Not written: the block failed the analysis checks after the redo.'
      )
    ).toBeInTheDocument();
  });

  it('the run failed to load — the reason and Retry', () => {
    hooks.runError = true;
    view();
    expect(screen.getByText(/Failed to load the analysis run\./)).toBeInTheDocument();
    fireEvent.click(button('Retry'));
    expect(hooks.refetch).toHaveBeenCalledTimes(1);
  });

  it('a paused regeneration: Continue, its refusal in the words of the analysis run', () => {
    actions().resume.error = new ApiError({
      statusCode: 409,
      message: 'not ready',
      data: { code: 'ANALYSIS_WRITE_NOT_READY' },
    });
    actions().resume.variables = { id: 'op-2' };
    hooks.run = run({
      items: [
        item({
          outcome: 'written',
          regenerating: true,
          regenOperationId: 'op-2',
          regenOperationStatus: 'paused',
          regenPauseReason: 'STEP_FAILED',
        }),
      ],
    });
    view();
    const c = card('Main idea');
    expect(within(c).getByRole('button', { name: 'Continue' })).toBeInTheDocument();
    expect(
      within(c).getByText(
        'The run is not ready any more: it is being written, failed or discarded.'
      )
    ).toBeInTheDocument();
  });

  it('a stopped «Accept all» still names the items it left as proposals (T174, p.1)', async () => {
    const items = [item({ index: 0 }), item({ index: 1, target: 'themes', step: 3 })];
    hooks.run = run({ items });
    actions().acceptAll.mutateAsync.mockRejectedValueOnce(
      new ApiError({
        statusCode: 409,
        message: 'not ready',
        data: {
          code: 'ANALYSIS_WRITE_NOT_READY',
          acceptedIndexes: [],
          skipped: [{ index: 1, code: 'ANALYSIS_BLOCK_CHANGED' }],
        },
      })
    );
    view();
    fireEvent.click(button('Accept all'));
    const list = await screen.findByRole('list', { name: 'Left as proposals' });
    expect(within(list).getByText(/^Themes: the editor changed the block/)).toBeInTheDocument();
  });

  it.each([
    ['the run is no longer ready', () => run({ status: 'failed' })],
    ['the reload brought no run', () => null],
  ])(
    'a stopped «Accept all» is shown when %s, without advice on buttons that are gone (T174, p.1)',
    async (_name, after) => {
      const items = [item({ index: 0 }), item({ index: 1, target: 'themes', step: 3 })];
      hooks.run = run({ items });
      actions().acceptAll.mutateAsync.mockImplementationOnce(() => {
        hooks.run = after();
        return Promise.reject(
          new ApiError({
            statusCode: 409,
            message: 'not ready',
            data: {
              code: 'ANALYSIS_WRITE_NOT_READY',
              acceptedIndexes: [],
              skipped: [{ index: 1, code: 'ANALYSIS_BLOCK_CHANGED' }],
            },
          })
        );
      });
      const { rerender } = view();
      fireEvent.click(button('Accept all'));
      await waitFor(() => expect(onBlocksWritten).toHaveBeenCalledTimes(1));
      rerender(element());
      expect(screen.getByText(/The run is not ready any more/)).toBeInTheDocument();
      const list = screen.getByRole('list', { name: 'Skipped before the stop' });
      expect(within(list).getByText('Themes: the editor changed the block.')).toBeInTheDocument();
    }
  );

  const stopWith = () =>
    new ApiError({
      statusCode: 409,
      message: 'not ready',
      data: {
        code: 'ANALYSIS_WRITE_NOT_READY',
        acceptedIndexes: [],
        skipped: [{ index: 1, code: 'ANALYSIS_BLOCK_CHANGED' }],
      },
    });

  it('a refusal other than «not ready» is not shown over another run (T174, p.1)', async () => {
    hooks.run = run({ items: [item({ index: 0 })] });
    actions().acceptAll.mutateAsync.mockImplementationOnce(() => {
      hooks.run = run({ id: 'd2', status: 'building', items: [] });
      return Promise.reject(new ApiError({ statusCode: 500, message: 'boom' }));
    });
    const { rerender } = view();
    fireEvent.click(button('Accept all'));
    await waitFor(() => expect(onBlocksWritten).toHaveBeenCalledTimes(1));
    rerender(element());
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('Accept stays closed while the proposal is being reread: nothing goes out without a print (T174, p.2)', () => {
    hooks.fetching = [0];
    view();
    const accept = within(card('Main idea')).getByRole('button', { name: 'Accept' });
    expect(accept).toBeDisabled();
    fireEvent.click(accept);
    expect(actions().accept.mutateAsync).not.toHaveBeenCalled();
  });

  it('a proposal changed elsewhere: the card says so and nothing is written (T174, p.2)', async () => {
    actions().accept.mutateAsync.mockRejectedValueOnce(
      new ApiError({
        statusCode: 409,
        message: 'changed',
        data: { code: 'ANALYSIS_PROPOSAL_CHANGED' },
      })
    );
    view();
    const c = card('Main idea');
    fireEvent.click(within(c).getByRole('button', { name: 'Accept' }));
    expect(await within(c).findByRole('alert')).toHaveTextContent(
      'The proposal changed since you opened it'
    );
    expect(onBlocksWritten).not.toHaveBeenCalled();
  });

  it('a new run from another tab is what stops «Accept all»: the refusal and the reasons stay (T174, p.1)', async () => {
    const items = [item({ index: 0 }), item({ index: 1, target: 'themes', step: 3 })];
    hooks.run = run({ items });
    actions().acceptAll.mutateAsync.mockImplementationOnce(() => {
      hooks.run = run({ id: 'd2', status: 'building', items: [] });
      return Promise.reject(stopWith());
    });
    const { rerender } = view();
    fireEvent.click(button('Accept all'));
    await waitFor(() => expect(onBlocksWritten).toHaveBeenCalledTimes(1));
    rerender(element());
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.getByText(/The run is not ready any more/)).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Skipped before the stop' })).toBeInTheDocument();
  });

  const stoppedText = /The run is not ready any more/;
  const stopThenNoRun = async () => {
    hooks.run = run({ items: [item({ index: 0 })] });
    actions().acceptAll.mutateAsync.mockImplementationOnce(() => {
      hooks.run = null;
      return Promise.reject(stopWith());
    });
    const rendered = view();
    fireEvent.click(button('Accept all'));
    await waitFor(() => expect(onBlocksWritten).toHaveBeenCalledTimes(1));
    rendered.rerender(element());
    expect(screen.getByText(stoppedText)).toBeInTheDocument();
    return rendered;
  };

  it('a stopped «Accept all» goes with the Start of this tab (T174, p.1)', async () => {
    const { rerender } = await stopThenNoRun();
    actions().start.isPending = true;
    rerender(element());
    await waitFor(() => expect(screen.queryByText(stoppedText)).not.toBeInTheDocument());
  });

  /** Обрыв «Accept all» хода d1, после него на экране упавший ход `failedId` с «Discard run». */
  const stopThenFailed = async (failedId = 'd1') => {
    hooks.run = run({ items: [item({ index: 0 })] });
    actions().acceptAll.mutateAsync.mockImplementationOnce(() => {
      hooks.run = run({
        id: failedId,
        status: 'failed',
        failedReason: 'DRAFT_CANCELLED',
        items: [],
      });
      return Promise.reject(stopWith());
    });
    const rendered = view();
    fireEvent.click(button('Accept all'));
    await waitFor(() => expect(onBlocksWritten).toHaveBeenCalledTimes(1));
    rendered.rerender(element());
    expect(screen.getByText(stoppedText)).toBeInTheDocument();
    fireEvent.click(button('Discard run'));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Discard' }));
    expect(actions().discardRun.mutate).toHaveBeenCalledTimes(1);
    expect(actions().discardRun.mutate).toHaveBeenCalledWith(failedId, {
      onSuccess: expect.any(Function),
    });
    const { onSuccess } = actions().discardRun.mutate.mock.calls[0][1] as { onSuccess: () => void };
    return { ...rendered, onSuccess };
  };

  it('a stopped «Accept all» goes when its run is discarded — after the answer, with no run left on screen (T190)', async () => {
    const { rerender, onSuccess } = await stopThenFailed();
    // До ответа итог на месте.
    expect(screen.getByText(stoppedText)).toBeInTheDocument();
    // Перечитанный `latest` приходит раньше ответа сброса: хода на экране уже нет.
    hooks.run = null;
    rerender(element());
    act(() => onSuccess());
    expect(screen.queryByText(stoppedText)).not.toBeInTheDocument();
  });

  it('a refused discard keeps the stopped «Accept all» (T190)', async () => {
    const { rerender } = await stopThenFailed();
    // Отказ: колбэк успеха не зовётся.
    actions().discardRun.error = new ApiError({
      statusCode: 409,
      message: 'gone',
      data: { code: 'DRAFT_DISCARDED' },
    });
    rerender(element());
    expect(screen.getByText(stoppedText)).toBeInTheDocument();
  });

  it('the discard of another run keeps the stopped «Accept all» of its own run (T190)', async () => {
    const { rerender, onSuccess } = await stopThenFailed('d2');
    hooks.run = null;
    rerender(element());
    act(() => onSuccess());
    expect(screen.getByText(stoppedText)).toBeInTheDocument();
  });

  it('a ready run of another clears it for good: it does not come back when that run is gone (T174, p.1)', async () => {
    const { rerender } = await stopThenNoRun();
    hooks.run = run({ id: 'd2', status: 'ready', items: [] });
    rerender(element());
    expect(screen.queryByText(stoppedText)).not.toBeInTheDocument();
    hooks.run = null;
    rerender(element());
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.queryByText(stoppedText)).not.toBeInTheDocument();
  });

  it('a 409 late after a ready run of another appeared does not stay either (T174, p.1)', async () => {
    hooks.run = run({ items: [item({ index: 0 })] });
    let fail: (e: unknown) => void = () => undefined;
    actions().acceptAll.mutateAsync.mockImplementationOnce(
      () => new Promise((_resolve, reject) => (fail = reject))
    );
    const { rerender } = view();
    fireEvent.click(button('Accept all'));
    hooks.run = run({ id: 'd2', status: 'ready', items: [] });
    rerender(element());
    await act(async () => fail(stopWith()));
    await waitFor(() => expect(onBlocksWritten).toHaveBeenCalledTimes(1));
    hooks.run = null;
    rerender(element());
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.queryByText(stoppedText)).not.toBeInTheDocument();
  });

  it('a shown stopped «Accept all» goes when the version changes (T174, p.1)', async () => {
    const { rerender } = await stopThenNoRun();
    rerender(element('v2'));
    await waitFor(() => expect(screen.queryByText(stoppedText)).not.toBeInTheDocument());
  });

  it('a 409 late after the version changed is not put on the new version (T174, p.1)', async () => {
    hooks.run = run({ items: [item({ index: 0 })] });
    let fail: (e: unknown) => void = () => undefined;
    actions().acceptAll.mutateAsync.mockImplementationOnce(
      () => new Promise((_resolve, reject) => (fail = reject))
    );
    const { rerender } = view();
    fireEvent.click(button('Accept all'));
    hooks.run = null;
    rerender(element('v2'));
    await act(async () => fail(stopWith()));
    await waitFor(() => expect(onBlocksWritten).toHaveBeenCalledTimes(1));
    expect(screen.queryByText(stoppedText)).not.toBeInTheDocument();
  });

  it('an external block: EXTERNAL_CHECK is neither a model flag nor an OK (T174, p.3)', () => {
    hooks.run = run({
      items: [
        item({
          target: 'context',
          step: 5,
          verdict: 'flags',
          remarks: [{ code: 'EXTERNAL_CHECK', where: 'context.0', note: 'check', by: 'code' }],
        }),
      ],
    });
    view();
    const c = card('Context');
    expect(within(c).queryByText(/Model flags/)).toBeNull();
    expect(within(c).queryByText('Model check: OK')).toBeNull();
  });

  it('a facts subfield is a proposal of its own, accepted by its index', async () => {
    hooks.proposals[3] = value({ text: 'Third person', print: 'print-3' });
    hooks.run = run({ items: [item({ index: 3, target: 'facts.narrator', step: 1 })] });
    view();
    const c = card('Facts: narrator');
    expect(within(c).getByText('Third person')).toBeInTheDocument();
    fireEvent.click(within(c).getByRole('button', { name: 'Accept' }));
    await waitFor(() =>
      expect(actions().accept.mutateAsync).toHaveBeenCalledWith({
        id: 'd1',
        index: 3,
        expectedPrint: 'print-3',
      })
    );
    expect(actions().accept.mutateAsync).toHaveBeenCalledTimes(1);
  });

  it('Accept 409 ANALYSIS_BLOCK_CHANGED: what the block holds now, and the form reloads', async () => {
    actions().accept.mutateAsync.mockRejectedValueOnce(
      new ApiError({
        statusCode: 409,
        message: 'changed',
        data: { code: 'ANALYSIS_BLOCK_CHANGED', current: 'Edited by hand' },
      })
    );
    view();
    fireEvent.click(within(card('Main idea')).getByRole('button', { name: 'Accept' }));
    const c = card('Main idea');
    expect(await within(c).findByText(/is not overwritten\. It holds now:/)).toBeInTheDocument();
    expect(within(c).getByText('Edited by hand')).toBeInTheDocument();
    expect(onBlocksWritten).toHaveBeenCalledTimes(1);
  });

  it('Accept 409 refused by the analysis: the reason, no reload (nothing written)', async () => {
    actions().accept.mutateAsync.mockRejectedValueOnce(
      new ApiError({
        statusCode: 409,
        message: 'refused',
        data: { code: 'ANALYSIS_WRITE_REFUSED', errors: ['sources: at most 20 sources'] },
      })
    );
    view();
    fireEvent.click(within(card('Main idea')).getByRole('button', { name: 'Accept' }));
    expect(
      await within(card('Main idea')).findByText(
        'The analysis refused this block: sources: at most 20 sources.'
      )
    ).toBeInTheDocument();
    expect(onBlocksWritten).not.toHaveBeenCalled();
  });

  it('Accept refused with a full list of sources — the same hint as Accept all', async () => {
    hooks.run = run({
      items: [
        item({
          target: 'context',
          step: 5,
          remarks: [{ code: 'LIMIT_OUT', where: 'sources', note: 'full', by: 'code' }],
        }),
      ],
    });
    actions().accept.mutateAsync.mockRejectedValueOnce(
      new ApiError({
        statusCode: 409,
        message: 'refused',
        data: { code: 'ANALYSIS_WRITE_REFUSED', errors: ['sources: at most 20 sources'] },
      })
    );
    view();
    fireEvent.click(within(card('Context')).getByRole('button', { name: 'Accept' }));
    expect(
      await within(card('Context')).findByText(
        'The analysis refused this block: sources: at most 20 sources. To accept it, free a place in the sources or regenerate the block.'
      )
    ).toBeInTheDocument();
    expect(actions().accept.mutateAsync).toHaveBeenCalledTimes(1);
  });

  it('Regenerate: a remark up to 2000 characters, the hint about proposals, the remark is sent', async () => {
    view();
    const c = card('Main idea');
    // Подсказка видна у самой кнопки, до раскрытия формы (F07-3, шаг 7).
    expect(
      within(c).getByText(/A filled block always comes back as a proposal/)
    ).toBeInTheDocument();
    fireEvent.click(within(c).getByRole('button', { name: 'Regenerate' }));
    const remark = within(c).getByLabelText('Remark for the author (optional)');
    expect(remark).toHaveAttribute('maxLength', '2000');
    expect(
      within(c).getByText(/A filled block always comes back as a proposal/)
    ).toBeInTheDocument();
    fireEvent.change(remark, { target: { value: '  Less general  ' } });
    fireEvent.click(within(c).getByRole('button', { name: 'Start regeneration' }));
    await waitFor(() =>
      expect(actions().regenerate.mutateAsync).toHaveBeenCalledWith({
        id: 'd1',
        index: 0,
        remark: 'Less general',
      })
    );
    expect(actions().regenerate.mutateAsync).toHaveBeenCalledTimes(1);
  });

  it('no Regenerate at sources and at theme links', () => {
    hooks.proposals[1] = value({ characters: [] });
    hooks.run = run({
      items: [
        item({ index: 0, target: 'sources', step: 5, outcome: 'written' }),
        item({ index: 1, target: 'characters', step: 3, links: true }),
        item({ index: 2, target: 'themes', step: 3, outcome: 'written' }),
      ],
    });
    view();
    expect(within(card('Sources')).queryByRole('button', { name: 'Regenerate' })).toBeNull();
    const links = card('Theme links in characters');
    expect(within(links).queryByRole('button', { name: 'Regenerate' })).toBeNull();
    expect(within(links).getByRole('button', { name: 'Accept' })).toBeInTheDocument();
    expect(within(card('Themes')).getByRole('button', { name: 'Regenerate' })).toBeInTheDocument();
  });

  it('«Save analysis» in flight — Accept all, Discard and Regenerate wait: the full save would land over their writes', () => {
    hooks.run = run({ items: [item({ index: 0, target: 'mainIdea' })] });
    saving = true;
    const { rerender } = view();
    expect(button('Accept all')).toBeDisabled();
    expect(button('Discard')).toBeDisabled();
    expect(button('Regenerate')).toBeDisabled();
    saving = false;
    rerender(element());
    expect(button('Accept all')).toBeEnabled();
    expect(button('Discard')).toBeEnabled();
  });

  it('Accept all lists what it left as proposals and why; a full list of sources — what to do', async () => {
    const items = [
      item({ index: 0, target: 'mainIdea' }),
      item({ index: 1, target: 'themes' }),
      item({
        index: 2,
        target: 'context',
        step: 5,
        remarks: [{ code: 'LIMIT_OUT', where: 'sources', note: 'full', by: 'code' }],
      }),
      item({ index: 3, target: 'symbols' }),
    ];
    hooks.run = run({ items });
    actions().acceptAll.mutateAsync.mockResolvedValueOnce({
      ...run({ items }),
      skipped: [
        { index: 1, code: 'ANALYSIS_BLOCK_CHANGED' },
        { index: 2, code: 'ANALYSIS_WRITE_REFUSED' },
        { index: 3, code: 'ANALYSIS_REGEN_IN_PROGRESS' },
      ],
    });
    view();
    fireEvent.click(button('Accept all'));
    const list = await screen.findByRole('list', { name: 'Left as proposals' });
    expect(
      within(list).getByText(
        'Themes: the editor changed the block: press Accept to see what the block holds now, or Discard.'
      )
    ).toBeInTheDocument();
    expect(
      within(list).getByText(
        'Context: the analysis refused the write: free a place in the sources or regenerate the block.'
      )
    ).toBeInTheDocument();
    expect(within(list).getByText('Symbols: the block is being regenerated.')).toBeInTheDocument();
    expect(actions().acceptAll.mutateAsync).toHaveBeenCalledTimes(1);
    expect(actions().acceptAll.mutateAsync).toHaveBeenCalledWith('d1');
    expect(onBlocksWritten).toHaveBeenCalledTimes(1);
  });

  describe('the run', () => {
    it('building: «Step N of M: <step>», Write Analysis unavailable', () => {
      hooks.run = run({
        status: 'building',
        operation: operation({ status: 'active' }),
        steps: [step({ step: 1 })],
        items: [],
      });
      view();
      expect(screen.getByText('Step 2 of 5: Key quotes and style…')).toBeInTheDocument();
      expect(button('Write Analysis')).toBeDisabled();
    });

    it('paused: the reason and Continue; Discard run', () => {
      hooks.run = run({
        status: 'building',
        operation: operation({ status: 'paused', pauseReason: 'STEP_FAILED' }),
        items: [],
      });
      view();
      fireEvent.click(button('Continue'));
      expect(actions().resume.mutate).toHaveBeenCalledTimes(1);
      expect(actions().resume.mutate).toHaveBeenCalledWith({ id: 'op-1' });
      expect(button('Discard run')).toBeInTheDocument();
    });

    it('failed: «Failed: <reason>»', () => {
      hooks.run = run({ status: 'failed', failedReason: 'DRAFT_CANCELLED', items: [] });
      view();
      expect(screen.getByText('Failed: its operation was cancelled.')).toBeInTheDocument();
      expect(button('Discard run')).toBeInTheDocument();
    });

    it('what the code dropped is listed at its step with the reason', () => {
      hooks.run = run({
        steps: [
          step({
            step: 2,
            dropped: [{ code: 'CHAPTER_UNKNOWN', path: 'keyQuotes.1.chapter', note: 'chapter 40' }],
          }),
          step({ step: 5, source: 'none' }),
        ],
        droppedQuotes: [
          {
            step: 2,
            path: 'keyQuotes.3',
            text: 'Not in the book',
            chapter: 2,
            reason: 'NOT_FOUND',
          },
        ],
        droppedSources: [{ title: 'Blog', host: 'blog.example', reason: 'SOURCE_UNRELATED' }],
        items: [],
      });
      view();
      const two = screen.getByRole('list', { name: 'Dropped at step 2' });
      expect(
        within(two).getByText('CHAPTER_UNKNOWN — keyQuotes.1.chapter: chapter 40')
      ).toBeInTheDocument();
      expect(
        within(two).getByText(
          'Quote dropped: «Not in the book» at keyQuotes.3 (chapter 2) — not word for word in the chapter'
        )
      ).toBeInTheDocument();
      const five = screen.getByRole('list', { name: 'Dropped at step 5' });
      expect(
        within(five).getByText(
          'Source dropped: Blog (blog.example) — names neither the book nor the author'
        )
      ).toBeInTheDocument();
    });

    it('Write Analysis: the estimate and the limit in the window, Start runs it', () => {
      hooks.run = null;
      hooks.estimate = {
        dossier: null,
        glossary: null,
        stageUsd: '1.2',
        upperBound: false,
        suggestedLimitUsd: '1.8',
      };
      view();
      fireEvent.click(button('Write Analysis'));
      const dialog = screen.getByRole('dialog');
      expect(within(dialog).getByText(/The analysis: up to \$1\.2\./)).toBeInTheDocument();
      expect(within(dialog).getByText(/Operation limit: \$1\.8\./)).toBeInTheDocument();
      fireEvent.click(within(dialog).getByRole('button', { name: 'Start' }));
      expect(actions().start.mutate).toHaveBeenCalledTimes(1);
      expect(actions().start.mutate).toHaveBeenCalledWith({});
    });

    it('a start refused DOSSIER_STALE offers Rebuild dossier', () => {
      hooks.run = null;
      actions().start.error = new ApiError({
        statusCode: 409,
        message: 'stale',
        data: { code: 'DOSSIER_STALE' },
      });
      view();
      expect(
        screen.getByText('The book text changed after the dossier was built: rebuild the dossier.')
      ).toBeInTheDocument();
      expect(button('Rebuild dossier')).toBeInTheDocument();
    });
  });

  describe('written blocks of the poll reload the form', () => {
    it('a new written block reloads; the same block again does not', () => {
      hooks.run = run({ items: [item({ outcome: 'proposed' })] });
      const { rerender } = view();
      expect(onBlocksWritten).not.toHaveBeenCalled();
      hooks.run = run({ items: [item({ outcome: 'written' })] });
      rerender(element());
      expect(onBlocksWritten).toHaveBeenCalledTimes(1);
      hooks.run = run({ items: [item({ outcome: 'written' })] });
      rerender(element());
      expect(onBlocksWritten).toHaveBeenCalledTimes(1);
    });

    it('a regeneration of a written block ended reloads (a cleared block is written again under the same index)', () => {
      hooks.run = run({ items: [item({ outcome: 'written' })] });
      const { rerender } = view();
      expect(onBlocksWritten).toHaveBeenCalledTimes(1);
      hooks.run = run({
        items: [item({ outcome: 'written', regenerating: true, regenOperationId: 'op-r' })],
      });
      rerender(element());
      expect(onBlocksWritten).toHaveBeenCalledTimes(1);
      hooks.run = run({ items: [item({ outcome: 'written' })] });
      rerender(element());
      expect(onBlocksWritten).toHaveBeenCalledTimes(2);
      rerender(element());
      expect(onBlocksWritten).toHaveBeenCalledTimes(2);
    });

    it('the first answer already with written blocks reloads once', () => {
      hooks.run = run({ items: [item({ outcome: 'written' })] });
      const { rerender } = view();
      expect(onBlocksWritten).toHaveBeenCalledTimes(1);
      rerender(element());
      expect(onBlocksWritten).toHaveBeenCalledTimes(1);
    });

    it('a new run with the same index written reloads: its writes are new', () => {
      hooks.run = run({ items: [item({ outcome: 'written' })] });
      const { rerender } = view();
      hooks.run = run({ id: 'd2', items: [item({ outcome: 'written' })] });
      rerender(element());
      expect(onBlocksWritten).toHaveBeenCalledTimes(2);
    });

    it('another version: its first answer with written blocks reloads again', () => {
      hooks.run = run({ items: [item({ outcome: 'written' })] });
      const { rerender } = view();
      rerender(element('v2'));
      expect(onBlocksWritten).toHaveBeenCalledTimes(2);
    });
  });
});
