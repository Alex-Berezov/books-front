import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WorldWrite } from '@/components/admin/books/WorldTab/WorldWrite';
import { ApiError } from '@/types/api';
import type { WorldWrite as WorldWriteRun, WorldWriteValue } from '@/types/api-schema';
import { item, operation, run, step } from '../../fixtures/worldWrite';

/**
 * F08-4b: панель хода «Write World» во вкладке World — старт с оценкой, ход по шагам, пауза
 * и отказ, выброшенное, «Accept» с `expectedPrint`, конфликт блока, «Accept all» с пропущенными,
 * «Regenerate», «записано сразу» против «предложено». Хуки подменены; правила хода и коды — настоящие.
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
  proposals: {} as Record<number, unknown>,
  fetching: [] as number[],
  proposalErrors: {} as Record<number, unknown>,
  estimate: undefined as unknown,
  actions: {} as Record<string, unknown>,
  invalidateWorld: vi.fn(),
  refetchProposal: vi.fn(),
}));

vi.mock('@/api/hooks', async () => ({
  ...(await vi.importActual<object>('@/api/hooks/draftKeys')),
  invalidateBookWorld: hooks.invalidateWorld,
  useWorldWrite: () => ({
    data: hooks.runError ? undefined : { draft: hooks.run },
    isError: hooks.runError,
    refetch: hooks.refetch,
  }),
  useWorldWriteActions: () => hooks.actions,
  useWorldWriteEstimate: (_v: string, enabled: boolean) => ({
    data: enabled ? hooks.estimate : undefined,
    isError: false,
    error: null,
    isFetching: false,
  }),
  useWorldWriteProposal: (_run: string, index: number, enabled: boolean) => {
    const error = enabled ? (hooks.proposalErrors[index] ?? null) : null;
    return {
      data: enabled ? hooks.proposals[index] : undefined,
      error,
      isError: error !== null,
      isFetching: enabled && hooks.fetching.includes(index),
      refetch: hooks.refetchProposal,
    };
  },
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

const value = (patch: Partial<WorldWriteValue> = {}): WorldWriteValue => ({
  print: 'print-1',
  text: null,
  aliases: null,
  profile: null,
  arc: null,
  scenes: null,
  relations: null,
  quotes: null,
  faq: null,
  adaptations: null,
  compare: null,
  sources: null,
  ...patch,
});

const element = (versionId = 'v1') => (
  <QueryClientProvider client={new QueryClient()}>
    <WorldWrite versionId={versionId} lang="en" />
  </QueryClientProvider>
);
const view = () => render(element());
const card = (name: string) => screen.getByRole('article', { name });
const button = (name: string) => screen.getByRole('button', { name });
const conflict = (code: string, data: object = {}) =>
  new ApiError({ statusCode: 409, message: code, data: { code, ...data } });

describe('WorldWrite (F08-4b)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hooks.run = run();
    hooks.runError = false;
    hooks.refetch = vi.fn();
    hooks.proposals = { 0: value({ text: 'Proposed short' }) };
    hooks.fetching = [];
    hooks.proposalErrors = {};
    hooks.estimate = undefined;
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

  describe('start', () => {
    it('Write World: the estimate with the number of characters and the limit, Start runs it', () => {
      hooks.run = null;
      hooks.estimate = {
        dossier: null,
        glossary: null,
        candidates: 2,
        pairs: 1,
        stageUsd: '1.2',
        upperBound: false,
        suggestedLimitUsd: '1.8',
      };
      view();
      fireEvent.click(button('Write World'));
      const dialog = screen.getByRole('dialog');
      expect(
        within(dialog).getByText(
          /The world: at most 2 characters \(main and secondary\), at most 1 character pair, up to \$1\.2\./
        )
      ).toBeInTheDocument();
      expect(within(dialog).getByText(/Operation limit: \$1\.8\./)).toBeInTheDocument();
      fireEvent.click(within(dialog).getByRole('button', { name: 'Start' }));
      expect(actions().start.mutate).toHaveBeenCalledTimes(1);
      expect(actions().start.mutate).toHaveBeenCalledWith({});
    });

    it.each([
      ['WORLD_ANALYSIS_MISSING', 'write the analysis first'],
      ['WORLD_LANGUAGE_UNSUPPORTED', 'does not take versions in this language'],
    ])('a start refused %s says why in words', (code, text) => {
      hooks.run = null;
      actions().start.error = conflict(code);
      view();
      expect(screen.getByText(new RegExp(text))).toBeInTheDocument();
    });

    it('a start refused DOSSIER_STALE offers Rebuild dossier', () => {
      hooks.run = null;
      actions().start.error = conflict('DOSSIER_STALE');
      view();
      expect(button('Rebuild dossier')).toBeInTheDocument();
    });
  });

  describe('the run', () => {
    it('building: the choice step first, Write World unavailable', () => {
      hooks.run = run({
        status: 'building',
        operation: operation({ status: 'active' }),
        stepsTotal: null,
        candidates: null,
        steps: [],
        items: [],
      });
      view();
      expect(
        screen.getByText('Step 1: choosing the characters and name forms…')
      ).toBeInTheDocument();
      expect(button('Write World')).toBeDisabled();
    });

    it('building: «Step N of M» names the page and the external blocks of the character', () => {
      const base = {
        status: 'building' as const,
        operation: operation({ status: 'active' }),
        items: [],
      };
      hooks.run = run({ ...base, steps: [step()] });
      const { unmount } = view();
      expect(screen.getByText('Step 2 of 3: Page: Anna…')).toBeInTheDocument();
      unmount();
      hooks.run = run({ ...base, steps: [step(), step({ step: 1, kind: 'page', key: 'anna' })] });
      view();
      expect(screen.getByText('Step 3 of 3: External blocks: Anna…')).toBeInTheDocument();
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

    it('failed: «Failed: <reason>» from failedReason of the run, Discard run', () => {
      hooks.run = run({ status: 'failed', failedReason: 'WORLD_ANALYSIS_MISSING', items: [] });
      view();
      expect(
        screen.getByText('Failed: the version has no analysis with a main character.')
      ).toBeInTheDocument();
      expect(button('Discard run')).toBeInTheDocument();
    });

    it('a failed step shows its failedReason; the characters and name forms are listed', () => {
      hooks.run = run({
        steps: [
          step(),
          step({
            step: 1,
            kind: 'page',
            key: 'anna',
            outcome: 'failed',
            failedReason: 'WORLD_CHARACTER_NOT_FOUND',
          }),
        ],
        items: [],
      });
      view();
      expect(screen.getByText('Characters: Anna (Annie).')).toBeInTheDocument();
      expect(screen.getByText(/Step 2 of 3: Page: Anna —/)).toBeInTheDocument();
      expect(
        screen.getByText('failed: the name forms found the character in no chapter')
      ).toBeInTheDocument();
    });

    it('what the code dropped is listed at the step of its character with the reason', () => {
      hooks.run = run({
        candidates: [
          { key: 'anna', name: 'Anna', aliases: [], chapters: [1] },
          { key: 'boris', name: 'Boris', aliases: [], chapters: [1] },
        ],
        stepsTotal: 5,
        steps: [
          step({
            dropped: [{ code: 'ALIAS_NOT_IN_TEXT', path: 'aliases.2', note: 'Annushka' }],
          }),
          step({ step: 1, kind: 'page', key: 'anna' }),
          step({ step: 2, kind: 'external', key: 'anna' }),
          step({ step: 3, kind: 'page', key: 'boris' }),
        ],
        droppedQuotes: [
          { key: 'anna', chapter: 2, text: 'Not in the book', reason: 'QUOTE_NOT_VERBATIM' },
          { key: 'boris', chapter: null, text: 'Boris words', reason: 'CHAPTER_UNKNOWN' },
        ],
        droppedSources: [
          { key: 'anna', title: 'Blog', host: 'blog.example', reason: 'SOURCE_UNRELATED' },
        ],
        items: [],
      });
      view();
      const choice = screen.getByRole('list', { name: 'Dropped at step 1' });
      expect(
        within(choice).getByText('ALIAS_NOT_IN_TEXT — aliases.2: Annushka')
      ).toBeInTheDocument();
      const page = screen.getByRole('list', { name: 'Dropped at step 2' });
      expect(
        within(page).getByText(
          'Quote dropped: «Not in the book» (chapter 2) — not word for word in the chapter'
        )
      ).toBeInTheDocument();
      expect(within(page).queryByText(/Boris words/)).toBeNull();
      const external = screen.getByRole('list', { name: 'Dropped at step 3' });
      expect(
        within(external).getByText(
          'Source dropped: Blog (blog.example) — names neither the book nor the author'
        )
      ).toBeInTheDocument();
      const boris = screen.getByRole('list', { name: 'Dropped at step 4' });
      expect(
        within(boris).getByText('Quote dropped: «Boris words» — the version has no such chapter')
      ).toBeInTheDocument();
    });

    it('the run failed to load — the reason and Retry', () => {
      hooks.runError = true;
      view();
      fireEvent.click(button('Retry'));
      expect(hooks.refetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('blocks', () => {
    it('written at once and proposed are told apart by the outcome', () => {
      hooks.run = run({
        items: [
          item({ index: 0, block: 'short', outcome: 'written' }),
          item({ index: 1, block: 'character', outcome: 'proposed' }),
        ],
      });
      hooks.proposals = { 1: value({ text: 'Proposed character' }) };
      view();
      const written = card('Anna: Short description');
      expect(within(written).getByText(/Written to the world at once/)).toBeInTheDocument();
      expect(within(written).queryByRole('button', { name: 'Accept' })).toBeNull();
      const proposed = card('Anna: Character');
      expect(within(proposed).getByText(/Proposal: Accept writes it/)).toBeInTheDocument();
      expect(within(proposed).getByRole('button', { name: 'Accept' })).toBeInTheDocument();
    });

    it('model flags without EXTERNAL_CHECK, the review and the check of the model', () => {
      hooks.run = run({
        items: [
          item({
            verdict: 'flags',
            remarks: [
              { code: 'GENERIC', where: 'short', note: 'Too general', by: 'model' },
              { code: 'EXTERNAL_CHECK', where: 'critique', note: 'check', by: 'code' },
            ],
          }),
        ],
      });
      view();
      const c = card('Anna: Short description');
      expect(within(c).getByText('Model flags (1)')).toBeInTheDocument();
      expect(within(c).getByText(/Too general/)).toBeInTheDocument();
      expect(within(c).getByText('Checked by the model, not by a human.')).toBeInTheDocument();
    });

    it('pairs: the pair step, its dropped quotes, the left out characters and pairs with the reason', () => {
      hooks.run = run({
        candidates: [
          { key: 'anna', name: 'Anna', aliases: [], chapters: [1] },
          { key: 'boris', name: 'Boris', aliases: [], chapters: [1] },
        ],
        pairs: [{ key: 'anna--boris', a: 'anna', b: 'boris', linked: true, chapters: [1, 2] }],
        leftOut: [
          { key: 'dan', reason: 'BELOW_MIN_CHAPTERS', names: ['Dan'], chapters: 1 },
          { key: 'ev--fa', reason: 'PAIRS_MAX', names: ['Ev', 'Fa'], chapters: 4 },
        ],
        stepsTotal: 6,
        steps: [
          step(),
          step({
            step: 5,
            kind: 'pair',
            key: 'anna--boris',
            outcome: 'failed',
            failedReason: 'WORLD_PAIR_KEY_TAKEN',
          }),
        ],
        droppedQuotes: [
          { key: 'anna--boris', chapter: 2, text: 'Pair words', reason: 'QUOTE_NOT_VERBATIM' },
        ],
        items: [item({ key: 'anna--boris', block: 'compare' })],
      });
      hooks.proposals = {
        0: value({ compare: [{ feature: 'Age', a: 'young', chapterA: 1, b: 'old', chapterB: 2 }] }),
      };
      view();
      expect(
        screen.getByText('Pairs: Anna and Boris (2 common chapters, linked in the analysis).')
      ).toBeInTheDocument();
      expect(screen.getByText(/Step 6 of 6: Pair: Anna and Boris —/)).toBeInTheDocument();
      expect(
        screen.getByText('failed: the key of the pair is taken by an entity of another type')
      ).toBeInTheDocument();
      const left = screen.getByRole('list', { name: 'Left out of the run' });
      expect(
        within(left).getByText(
          'Dan (1 chapter): a secondary character in fewer chapters than the threshold.'
        )
      ).toBeInTheDocument();
      expect(
        within(left).getByText('Ev and Fa (4 common chapters): over the limit of pairs per run.')
      ).toBeInTheDocument();
      const dropped = screen.getByRole('list', { name: 'Dropped at step 6' });
      expect(within(dropped).getByText(/Quote dropped: «Pair words»/)).toBeInTheDocument();
      const c = card('Anna and Boris: Comparison');
      expect(within(c).getByText(/"feature": "Age"/)).toBeInTheDocument();
    });

    it('a pair page written without part of its core: the step names what is missing', () => {
      hooks.run = run({
        candidates: [
          { key: 'anna', name: 'Anna', aliases: [], chapters: [1] },
          { key: 'boris', name: 'Boris', aliases: [], chapters: [1] },
        ],
        pairs: [{ key: 'anna--boris', a: 'anna', b: 'boris', linked: true, chapters: [1] }],
        stepsTotal: 6,
        steps: [
          step(),
          step({
            step: 5,
            kind: 'pair',
            key: 'anna--boris',
            verdict: 'flags',
            remarks: [
              {
                code: 'CORE_MISSING',
                where: 'conclusion',
                note: 'Write the conclusion.',
                by: 'code',
              },
              { code: 'STYLE_POOR', where: 'short', note: 'Shorter.', by: 'model' },
            ],
          }),
        ],
        items: [],
      });
      view();
      const core = screen.getByRole('list', { name: 'Core missing at step 6' });
      expect(
        within(core).getByText('The step left the core without Conclusion: Write the conclusion.')
      ).toBeInTheDocument();
      expect(within(core).queryByText(/Shorter/)).toBeNull();
    });

    it('CORE_MISSING of a block that has its card (compare too short) is shown on the card, not twice', () => {
      const remark = {
        code: 'CORE_MISSING' as const,
        where: 'compare',
        note: 'Four rows at least.',
        by: 'code' as const,
      };
      hooks.run = run({
        candidates: [
          { key: 'anna', name: 'Anna', aliases: [], chapters: [1] },
          { key: 'boris', name: 'Boris', aliases: [], chapters: [1] },
        ],
        pairs: [{ key: 'anna--boris', a: 'anna', b: 'boris', linked: true, chapters: [1] }],
        stepsTotal: 6,
        steps: [
          step(),
          step({ step: 5, kind: 'pair', key: 'anna--boris', verdict: 'flags', remarks: [remark] }),
        ],
        items: [
          item({
            key: 'anna--boris',
            block: 'compare',
            step: 5,
            verdict: 'flags',
            remarks: [remark],
          }),
        ],
      });
      view();
      expect(screen.queryByRole('list', { name: 'Core missing at step 6' })).toBeNull();
      expect(
        within(card('Anna and Boris: Comparison')).getByText(/Four rows at least/)
      ).toBeInTheDocument();
    });

    it('a step without CORE_MISSING has no core list, other remarks included', () => {
      hooks.run = run({
        steps: [
          step({
            verdict: 'flags',
            remarks: [{ code: 'STYLE_POOR', where: 'short', note: 'Shorter.', by: 'model' }],
          }),
        ],
      });
      view();
      expect(screen.queryByRole('list', { name: /Core missing/ })).toBeNull();
    });

    it('no steps yet, only left-out characters: the list is shown', () => {
      hooks.run = run({
        steps: [],
        items: [],
        leftOut: [{ key: 'dan', reason: 'BELOW_MIN_CHAPTERS', names: ['Dan'], chapters: 1 }],
      });
      view();
      const left = screen.getByRole('list', { name: 'Left out of the run' });
      expect(
        within(left).getByText(
          'Dan (1 chapter): a secondary character in fewer chapters than the threshold.'
        )
      ).toBeInTheDocument();
    });

    it('no steps, nothing left out, pairs not off: no block of steps', () => {
      hooks.run = run({ steps: [], items: [] });
      view();
      expect(screen.queryByLabelText('Steps of the run')).toBeNull();
    });

    it('a finished pair step on one common chapter: the pair line and the done outcome', () => {
      hooks.run = run({
        candidates: [
          { key: 'anna', name: 'Anna', aliases: [], chapters: [1] },
          { key: 'boris', name: 'Boris', aliases: [], chapters: [1] },
        ],
        pairs: [{ key: 'anna--boris', a: 'anna', b: 'boris', linked: false, chapters: [3] }],
        stepsTotal: 6,
        steps: [step(), step({ step: 5, kind: 'pair', key: 'anna--boris' })],
        items: [],
      });
      view();
      expect(screen.getByText('Pairs: Anna and Boris (1 common chapter).')).toBeInTheDocument();
      expect(screen.getByText(/Step 6 of 6: Pair: Anna and Boris — done/)).toBeInTheDocument();
      expect(screen.queryByRole('list', { name: /Dropped at step/ })).toBeNull();
    });

    it('no pairs for a language without a sample: the run says so', () => {
      // Шагов ещё нет (ответ после выбора без шагов): причина всё равно видна.
      hooks.run = run({ pairsOff: 'WORLD_PAIR_LANGUAGE', steps: [] });
      view();
      expect(
        screen.getByText(/No pairs in this run: the language has no pair sample yet/)
      ).toBeInTheDocument();
    });

    it('an external block: «Verify facts» and its own verified sources', () => {
      hooks.run = run({ items: [item({ block: 'critique' })] });
      hooks.proposals = {
        0: value({ text: 'Critics said', sources: [{ title: 'Review', url: 'https://x.test/r' }] }),
      };
      view();
      const c = card('Anna: Critique');
      expect(within(c).getByText(/Verify facts/)).toBeInTheDocument();
      expect(within(c).getByRole('link', { name: 'Review' })).toHaveAttribute(
        'href',
        'https://x.test/r'
      );
    });

    it('a page block has no «Verify facts»', () => {
      view();
      expect(within(card('Anna: Short description')).queryByText(/Verify facts/)).toBeNull();
    });

    it('«Verify facts» only with content on screen: not for a discarded block, not while the proposal is not loaded', () => {
      hooks.run = run({
        items: [
          item({ index: 0, block: 'critique', outcome: 'discarded' }),
          item({ index: 1, block: 'prototypes', outcome: 'proposed' }),
        ],
      });
      hooks.proposals = {};
      view();
      expect(within(card('Anna: Critique')).queryByText(/Verify facts/)).toBeNull();
      expect(within(card('Anna: Prototypes')).queryByText(/Verify facts/)).toBeNull();
    });

    it('a written external block: «Verify facts» always, its sources are in the entity card', () => {
      hooks.run = run({ items: [item({ block: 'critique', outcome: 'written' })] });
      view();
      const c = card('Anna: Critique');
      expect(within(c).getByText(/Verify facts/)).toBeInTheDocument();
      expect(within(c).getByText(/saved with the entity/)).toBeInTheDocument();
    });

    it('EXTERNAL_CHECK of the code on a page block is not lost: «Verify facts», not a model flag', () => {
      hooks.run = run({
        items: [
          item({
            block: 'short',
            outcome: 'written',
            verdict: 'flags',
            remarks: [{ code: 'EXTERNAL_CHECK', where: 'short', note: 'check', by: 'code' }],
          }),
        ],
      });
      view();
      const c = card('Anna: Short description');
      expect(within(c).getByText(/Verify facts/)).toBeInTheDocument();
      expect(within(c).queryByText(/Model flags/)).toBeNull();
    });

    it('a proposal of empty lists says so and can be accepted', async () => {
      hooks.run = run({ items: [item({ block: 'scenes' })] });
      hooks.proposals = { 0: value({ scenes: [], print: 'print-empty' }) };
      view();
      const c = card('Anna: Scenes');
      expect(
        within(c).getByText('The proposal empties this block: Accept clears it.')
      ).toBeInTheDocument();
      const accept = within(c).getByRole('button', { name: 'Accept' });
      expect(accept).toBeEnabled();
      fireEvent.click(accept);
      await waitFor(() =>
        expect(actions().accept.mutateAsync).toHaveBeenCalledWith({
          id: 'd1',
          index: 0,
          expectedPrint: 'print-empty',
        })
      );
      expect(actions().accept.mutateAsync).toHaveBeenCalledTimes(1);
    });

    it('a filled proposal does not say it empties the block', () => {
      view();
      expect(
        within(card('Anna: Short description')).queryByText(/The proposal empties this block/)
      ).toBeNull();
    });

    it('the proposal failed to load: the reason and Retry reads it again', () => {
      hooks.proposalErrors = { 0: new Error('offline') };
      view();
      const c = card('Anna: Short description');
      expect(within(c).getByText(/Could not load the proposal/)).toBeInTheDocument();
      fireEvent.click(within(c).getByRole('button', { name: 'Retry' }));
      expect(hooks.refetchProposal).toHaveBeenCalledTimes(1);
      expect(within(c).getByRole('button', { name: 'Accept' })).toBeDisabled();
    });

    it('an empty object of the proposal (profile, arc) counts as empty: no «{}», Accept clears the block', () => {
      hooks.run = run({ items: [item({ block: 'profile' })] });
      hooks.proposals = { 0: value({ profile: {} }) };
      view();
      expect(within(card('Anna: Profile')).queryByText('{}')).toBeNull();
      expect(within(card('Anna: Profile')).getByText(/empties this block/)).toBeTruthy();
    });

    it('an empty list of the proposal is not drawn as «[]»', () => {
      hooks.run = run({ items: [item({ block: 'scenes' })] });
      hooks.proposals = { 0: value({ scenes: [], quotes: [] }) };
      view();
      expect(within(card('Anna: Scenes')).queryByText('[]')).toBeNull();
    });

    it('not written with a reason — the reason in red; nothing to add — neutral', () => {
      hooks.run = run({
        items: [
          item({
            index: 0,
            block: 'critique',
            outcome: 'none',
            verdict: 'failed',
            failedReason: 'EXTERNAL_UNVERIFIED',
          }),
          item({ index: 1, block: 'faq', outcome: 'none', verdict: 'ok', failedReason: null }),
        ],
      });
      view();
      expect(
        within(card('Anna: Critique')).getByText(
          'Not written: no statement of the block was confirmed by a source.'
        )
      ).toBeInTheDocument();
      expect(within(card('Anna: FAQ')).getByText('Nothing to add.')).toBeInTheDocument();
    });

    it('Accept goes out with the print of the shown proposal (expectedPrint)', async () => {
      hooks.proposals = { 0: value({ text: 'Proposed short', print: 'print-xyz' }) };
      view();
      const c = card('Anna: Short description');
      expect(within(c).getByText('Proposed short')).toBeInTheDocument();
      fireEvent.click(within(c).getByRole('button', { name: 'Accept' }));
      await waitFor(() =>
        expect(actions().accept.mutateAsync).toHaveBeenCalledWith({
          id: 'd1',
          index: 0,
          expectedPrint: 'print-xyz',
        })
      );
      expect(actions().accept.mutateAsync).toHaveBeenCalledTimes(1);
    });

    it('Accept stays closed while the proposal is not shown: nothing goes out without a print', () => {
      hooks.proposals = {};
      view();
      expect(
        within(card('Anna: Short description')).getByRole('button', { name: 'Accept' })
      ).toBeDisabled();
      hooks.proposals = { 0: value({ text: 'old' }) };
      hooks.fetching = [0];
      view();
      expect(
        within(screen.getAllByRole('article')[1]).getByRole('button', { name: 'Accept' })
      ).toBeDisabled();
      expect(actions().accept.mutateAsync).not.toHaveBeenCalled();
    });

    it('Accept 409 WORLD_BLOCK_CHANGED: what the block holds now, nothing else', async () => {
      actions().accept.mutateAsync.mockRejectedValueOnce(
        conflict('WORLD_BLOCK_CHANGED', { current: 'Hand-written text' })
      );
      view();
      const c = card('Anna: Short description');
      fireEvent.click(within(c).getByRole('button', { name: 'Accept' }));
      expect(await within(c).findByRole('alert')).toHaveTextContent(
        'The block was changed after this proposal and is not overwritten'
      );
      expect(within(c).getByText('Hand-written text')).toBeInTheDocument();
      expect(actions().accept.mutateAsync).toHaveBeenCalledTimes(1);
    });

    it('Accept 409 refused by the world import: the reasons from errors', async () => {
      actions().accept.mutateAsync.mockRejectedValueOnce(
        conflict('WORLD_WRITE_REFUSED', { errors: ['relations.0.to: unknown key'] })
      );
      view();
      const c = card('Anna: Short description');
      fireEvent.click(within(c).getByRole('button', { name: 'Accept' }));
      expect(await within(c).findByRole('alert')).toHaveTextContent(
        'The world import refused this block: relations.0.to: unknown key.'
      );
    });

    it('Accept 409 WORLD_PROPOSAL_CHANGED: read the new text and press again', async () => {
      actions().accept.mutateAsync.mockRejectedValueOnce(conflict('WORLD_PROPOSAL_CHANGED'));
      view();
      const c = card('Anna: Short description');
      fireEvent.click(within(c).getByRole('button', { name: 'Accept' }));
      expect(await within(c).findByRole('alert')).toHaveTextContent(
        'The proposal changed since you opened it'
      );
    });

    it('Discard goes to the block', async () => {
      view();
      fireEvent.click(
        within(card('Anna: Short description')).getByRole('button', { name: 'Discard' })
      );
      await waitFor(() =>
        expect(actions().discardItem.mutateAsync).toHaveBeenCalledWith({ id: 'd1', index: 0 })
      );
      expect(actions().discardItem.mutateAsync).toHaveBeenCalledTimes(1);
      expect(actions().accept.mutateAsync).not.toHaveBeenCalled();
    });

    it('Regenerate: the remark is sent; name forms have no Regenerate', async () => {
      hooks.run = run({
        items: [item({ index: 0 }), item({ index: 1, block: 'aliases', outcome: 'written' })],
      });
      view();
      expect(
        within(card('Anna: Name forms')).queryByRole('button', { name: 'Regenerate' })
      ).toBeNull();
      const c = card('Anna: Short description');
      fireEvent.click(within(c).getByRole('button', { name: 'Regenerate' }));
      const remark = within(c).getByLabelText('Remark for the author (optional)');
      expect(remark).toHaveAttribute('maxLength', '2000');
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

    it('a paused regeneration: Continue of its operation', () => {
      hooks.run = run({
        items: [
          item({
            regenerating: true,
            regenOperationId: 'op-2',
            regenOperationStatus: 'paused',
            regenPauseReason: 'LIMIT_REACHED',
          }),
        ],
      });
      view();
      const c = card('Anna: Short description');
      expect(within(c).getByLabelText('New limit of the regeneration')).toBeInTheDocument();
      expect(within(c).getByRole('button', { name: 'Continue' })).toBeInTheDocument();
      // Идущая перегенерация закрывает «Accept», «Discard» и «Regenerate».
      expect(within(c).queryByRole('button', { name: 'Regenerate' })).toBeNull();
    });
  });

  describe('Accept all', () => {
    it('lists what it left as proposals and why', async () => {
      hooks.run = run({ items: [item({ index: 0 }), item({ index: 1, block: 'character' })] });
      actions().acceptAll.mutateAsync.mockResolvedValueOnce({
        ...(hooks.run as WorldWriteRun),
        skipped: [
          { index: 1, code: 'WORLD_BLOCK_CHANGED' },
          { index: 0, code: 'WORLD_WRITE_REFUSED' },
        ],
      });
      view();
      fireEvent.click(button('Accept all'));
      const list = await screen.findByRole('list', { name: 'Left as proposals' });
      expect(
        within(list).getByText(/Anna: Character: the editor changed the block/)
      ).toBeInTheDocument();
      expect(
        within(list).getByText(/Anna: Short description: the world import refused the write/)
      ).toBeInTheDocument();
      expect(actions().acceptAll.mutateAsync).toHaveBeenCalledTimes(1);
      expect(actions().acceptAll.mutateAsync).toHaveBeenCalledWith('d1');
    });

    it('a stopped pass (WORLD_WRITE_NOT_READY) names the skipped items and the refusal', async () => {
      hooks.run = run({ items: [item({ index: 0 }), item({ index: 1, block: 'character' })] });
      actions().acceptAll.mutateAsync.mockRejectedValueOnce(
        conflict('WORLD_WRITE_NOT_READY', {
          skipped: [{ index: 1, code: 'WORLD_REGEN_IN_PROGRESS' }],
        })
      );
      const { rerender } = view();
      fireEvent.click(button('Accept all'));
      await waitFor(() =>
        expect(screen.getByText(/The run is not ready any more/)).toBeInTheDocument()
      );
      expect(actions().acceptAll.mutateAsync).toHaveBeenCalledTimes(1);
      // Ход уже не готов: итог остаётся без подсказок «что нажать».
      hooks.run = run({ status: 'building', operation: operation({ status: 'active' }) });
      rerender(element());
      const list = screen.getByRole('list', { name: 'Skipped before the stop' });
      expect(
        within(list).getByText('Anna: Character: the block is being regenerated.')
      ).toBeInTheDocument();
    });

    it('a stopped pass names the skipped by the characters of the run it was pressed on, not of the new run', async () => {
      hooks.run = run({ items: [item({ index: 0 }), item({ index: 1, block: 'character' })] });
      actions().acceptAll.mutateAsync.mockRejectedValueOnce(
        conflict('WORLD_WRITE_NOT_READY', {
          skipped: [{ index: 1, code: 'WORLD_BLOCK_CHANGED' }],
        })
      );
      const { rerender } = view();
      fireEvent.click(button('Accept all'));
      await waitFor(() =>
        expect(screen.getByText(/The run is not ready any more/)).toBeInTheDocument()
      );
      // Новый ход другой вкладки: героев ещё не выбрал, у ключа `anna` другого имени нет.
      hooks.run = run({
        id: 'd2',
        status: 'building',
        operation: operation({ status: 'active' }),
        stepsTotal: null,
        candidates: null,
        items: [],
      });
      rerender(element());
      const list = screen.getByRole('list', { name: 'Skipped before the stop' });
      expect(
        within(list).getByText('Anna: Character: the editor changed the block.')
      ).toBeInTheDocument();
    });

    it('is closed with nothing to accept; the cards stay', () => {
      hooks.run = run({ items: [item({ outcome: 'written' })] });
      view();
      expect(screen.queryByRole('button', { name: 'Accept all' })).toBeNull();
    });
  });

  describe('Discard run', () => {
    it('after confirmation discards the run by its id', () => {
      hooks.run = run({ status: 'failed', failedReason: 'DRAFT_CANCELLED', items: [] });
      view();
      fireEvent.click(button('Discard run'));
      fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Discard' }));
      expect(actions().discardRun.mutate).toHaveBeenCalledTimes(1);
      expect(actions().discardRun.mutate.mock.calls[0][0]).toBe('d1');
    });
  });

  describe('written blocks of the poll reload the world', () => {
    it('the first answer of the run with written blocks reloads the world: they were written while the tab was closed', () => {
      hooks.run = run({ items: [item({ index: 0, outcome: 'written' })] });
      const { rerender } = view();
      expect(hooks.invalidateWorld).toHaveBeenCalledTimes(1);
      hooks.run = run({
        items: [item({ index: 0, outcome: 'written' }), item({ index: 1, outcome: 'written' })],
      });
      rerender(element());
      expect(hooks.invalidateWorld).toHaveBeenCalledTimes(2);
    });

    it('the first answer without written blocks does not reload', () => {
      hooks.run = run({ items: [item({ outcome: 'proposed' })] });
      view();
      expect(hooks.invalidateWorld).not.toHaveBeenCalled();
    });

    it('a new written block reloads the world; the same block again does not', () => {
      hooks.run = run({ items: [item({ outcome: 'proposed' })] });
      const { rerender } = view();
      expect(hooks.invalidateWorld).not.toHaveBeenCalled();
      hooks.run = run({ items: [item({ outcome: 'written' })] });
      rerender(element());
      expect(hooks.invalidateWorld).toHaveBeenCalledTimes(1);
      hooks.run = run({ items: [item({ outcome: 'written' })] });
      rerender(element());
      expect(hooks.invalidateWorld).toHaveBeenCalledTimes(1);
    });
  });
});
