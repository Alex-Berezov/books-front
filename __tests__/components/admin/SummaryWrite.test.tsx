import { StrictMode } from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SummaryWrite } from '@/components/admin/books/SummaryTab/SummaryWrite';
import { ApiError } from '@/types/api';
import type {
  LlmOperation,
  SummaryWrite as SummaryWriteRun,
  SummaryWriteEstimate,
  SummaryWriteItem,
} from '@/types/api-schema';

/**
 * F06-3: ход «Write Summary» во вкладке Summary — старт с оценкой, отказы и пауза, отметки
 * проверки моделью, «Accept» / «Discard», 409 со свежими данными и подтверждением смены глав,
 * «Regenerate» с замечанием, «Discard run», «Accept all», перечитывание полей формы. Хуки подменены.
 */

const mutation = () => ({
  mutate: vi.fn(),
  mutateAsync: vi.fn().mockResolvedValue({}),
  reset: vi.fn(),
  isPending: false,
  isSuccess: false,
  error: null as unknown,
});

const hooks = vi.hoisted(() => ({
  run: null as unknown,
  loading: false,
  loadError: false,
  pollError: false,
  refetch: (() => undefined) as () => unknown,
  estimate: undefined as unknown,
  estimateError: null as unknown,
  estimateEnabled: [] as boolean[],
  dossierRefused: false,
  actions: {} as Record<string, unknown>,
}));

vi.mock('@/api/hooks', async () => ({
  // Чистые правила хода и коды — настоящие, мокаются только хуки.
  ...(await vi.importActual<object>('@/api/hooks/useSummaryWrite')),
  ...(await vi.importActual<object>('@/api/hooks/draftKeys')),
  useSummaryWrite: () => ({
    data: hooks.loading || hooks.loadError ? undefined : { draft: hooks.run },
    isError: hooks.loadError || hooks.pollError,
    refetch: hooks.refetch,
  }),
  useSummaryWriteActions: () => hooks.actions,
  useSummaryWriteEstimate: (_v: string, enabled: boolean) => {
    hooks.estimateEnabled.push(enabled);
    return {
      data: enabled ? hooks.estimate : undefined,
      isError: hooks.estimateError !== null,
      error: hooks.estimateError,
      isFetching: false,
    };
  },
  useDossierEstimate: (_v: string, enabled: boolean) => ({
    data: enabled
      ? {
          sourceVersionId: 's',
          chapters: 3,
          parts: 3,
          estimateUsd: '0.5',
          suggestedLimitUsd: '0.75',
          refusedTooLong: hooks.dossierRefused,
        }
      : undefined,
    isError: false,
    isFetching: false,
  }),
}));

type Mutation = ReturnType<typeof mutation>;
type Actions = Record<
  | 'start'
  | 'resume'
  | 'discardRun'
  | 'regenerate'
  | 'accept'
  | 'discardItem'
  | 'acceptAll'
  | 'rebuildDossier',
  Mutation
> & { refreshFields: ReturnType<typeof vi.fn> };
const actions = () => hooks.actions as Actions;

const operation = (patch: Partial<LlmOperation> = {}): LlmOperation => ({
  id: 'op-1',
  kind: 'draft',
  status: 'done',
  pauseReason: null,
  bookVersionId: 'v1',
  limitUsd: '2',
  reservedUsd: '0',
  spentUsd: '0.5',
  createdAt: '2026-11-02T00:00:00.000Z',
  updatedAt: '2026-11-02T00:00:00.000Z',
  ...patch,
});

const item = (patch: Partial<SummaryWriteItem> = {}): SummaryWriteItem => ({
  index: 0,
  target: 'section',
  number: 1,
  title: 'The storm',
  readerChapter: 1,
  html: '<p>Proposed text.</p>',
  attempt: 1,
  verdict: 'ok',
  remarks: [],
  review: { kind: 'answered', model: 'openai/gpt-6-luna' },
  outcome: 'proposed',
  failedReason: null,
  authorModel: 'z-ai/glm-5.3',
  regenFailedReason: null,
  regenerating: false,
  regenOperationId: null,
  regenOperationStatus: null,
  regenPauseReason: null,
  ...patch,
});

const full = (patch: Partial<SummaryWriteItem> = {}) =>
  item({ index: 4, target: 'full', number: null, title: null, ...patch });

const run = (patch: Partial<SummaryWriteRun> = {}): SummaryWriteRun => ({
  id: 'd1',
  bookVersionId: 'v1',
  status: 'ready',
  language: 'en',
  failedReason: null,
  waitingFor: null,
  operation: operation(),
  plannedSections: 2,
  sectionsDone: 2,
  owns: { sections: false, full: false, brief: false },
  items: [item()],
  chapterChanges: [],
  createdAt: '2026-11-02T00:00:00.000Z',
  updatedAt: '2026-11-02T00:00:00.000Z',
  ...patch,
});

const writing = (patch: Partial<SummaryWriteRun> = {}) =>
  run({ status: 'building', operation: operation({ status: 'active' }), items: [], ...patch });

const conflict = (data: Record<string, unknown>) =>
  new ApiError({ statusCode: 409, message: 'conflict', data });

const onFieldsWritten = vi.fn();
const element = () => <SummaryWrite versionId="v1" lang="en" onFieldsWritten={onFieldsWritten} />;
const view = () => render(element());
const card = (name: string) => screen.getByRole('article', { name });
const button = (name: string) => screen.getByRole('button', { name });
const dialog = () => screen.getByRole('dialog');

describe('SummaryWrite (F06-3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hooks.run = run();
    hooks.loading = false;
    hooks.loadError = false;
    hooks.pollError = false;
    hooks.refetch = vi.fn();
    hooks.estimate = undefined;
    hooks.estimateError = null;
    hooks.estimateEnabled.length = 0;
    hooks.dossierRefused = false;
    hooks.actions = {
      start: mutation(),
      resume: mutation(),
      discardRun: mutation(),
      regenerate: mutation(),
      accept: mutation(),
      discardItem: mutation(),
      acceptAll: mutation(),
      rebuildDossier: mutation(),
      refreshFields: vi.fn().mockResolvedValue(undefined),
    };
  });

  describe('marks of the model check', () => {
    it('«Model check: OK» by the model; «Model flags (N)» opens the list of remarks', () => {
      hooks.run = run({
        items: [
          item(),
          item({
            index: 1,
            number: 2,
            title: 'The shore',
            verdict: 'flags',
            remarks: [
              { code: 'NAME_MISMATCH', where: 'Jon', note: 'Use John', by: 'code' },
              { code: 'FACT_UNSUPPORTED', where: 'He flies', note: 'Not in the text', by: 'model' },
            ],
          }),
        ],
      });
      view();
      const ok = card('Section 1: The storm');
      expect(within(ok).getByText('Model check: OK')).toBeInTheDocument();
      expect(within(ok).getByText('Checked by the model, not by a human.')).toBeInTheDocument();
      expect(within(ok).queryByText(/Model flags/)).toBeNull();

      const flagged = card('Section 2: The shore');
      const summary = within(flagged).getByText('Model flags (2)');
      const details = summary.closest('details') as HTMLDetailsElement;
      expect(details.open).toBe(false);
      fireEvent.click(summary);
      expect(details.open).toBe(true);
      expect(within(details).getByText(/Jon: Use John \(code check\)/)).toBeInTheDocument();
      expect(within(details).getByText('FACT_UNSUPPORTED')).toBeInTheDocument();
      expect(within(details).getByText(/He flies: Not in the text \(model\)/)).toBeInTheDocument();
    });

    it('no model check and no remarks — only «Model check: not done», no «Model flags (0)»', () => {
      hooks.run = run({
        items: [item({ verdict: 'flags', review: { kind: 'not_independent', model: null } })],
      });
      view();
      const c = card('Section 1: The storm');
      expect(
        within(c).getByText(
          'Model check: not done (no reviewer model of another family than the author).'
        )
      ).toBeInTheDocument();
      expect(within(c).queryByText(/Model flags/)).toBeNull();
      expect(within(c).queryByText('Checked by the model, not by a human.')).toBeNull();
    });

    it('a failed text: the reason; on a ready run — regenerate or by hand, otherwise only by hand', () => {
      const failed = [
        item({ verdict: 'failed', html: '', outcome: 'none', failedReason: 'DRAFT_TOO_LONG' }),
        full({
          verdict: 'failed',
          html: '',
          outcome: 'none',
          failedReason: 'DRAFT_INVALID_RESPONSE',
        }),
      ];
      hooks.run = run({ items: failed });
      const { unmount } = view();
      const section = card('Section 1: The storm');
      expect(
        within(section).getByText('Failed: the text is too long for the model or for the field.')
      ).toBeInTheDocument();
      expect(
        within(section).getByText('Regenerate it or write the section by hand (Add section).')
      ).toBeInTheDocument();
      expect(within(section).queryByRole('button', { name: 'Accept' })).toBeNull();
      expect(
        within(card('Summary')).getByText(
          'Regenerate it or write the text by hand in the field below.'
        )
      ).toBeInTheDocument();
      unmount();
      hooks.run = writing({ items: failed });
      view();
      expect(
        within(card('Section 1: The storm')).getByText('Write the section by hand (Add section).')
      ).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Regenerate' })).toBeNull();
    });

    it('texts are listed sections by number, then the full, then the very short summary', () => {
      hooks.run = run({
        items: [
          item({ index: 0, target: 'brief', number: null, title: null }),
          full({ index: 1 }),
          item({ index: 2, number: 2, title: 'B' }),
          item({ index: 3, number: 1, title: 'A' }),
        ],
      });
      view();
      expect(screen.getAllByRole('heading', { level: 4 }).map((h) => h.textContent)).toEqual([
        'Section 1: A',
        'Section 2: B',
        'Summary',
        'Very short summary',
      ]);
    });
  });

  describe('Accept and Discard of a text', () => {
    it('Accept of the full summary posts the item and takes the field into the form', async () => {
      hooks.run = run({ items: [full()] });
      view();
      const c = card('Summary');
      expect(within(c).getByText('Proposed text.')).toBeInTheDocument();
      fireEvent.click(within(c).getByRole('button', { name: 'Accept' }));
      await waitFor(() => expect(onFieldsWritten).toHaveBeenCalledWith(['full']));
      expect(onFieldsWritten).toHaveBeenCalledTimes(1);
      expect(actions().accept.mutateAsync).toHaveBeenCalledTimes(1);
      expect(actions().accept.mutateAsync).toHaveBeenCalledWith({ id: 'd1', index: 4 });
    });

    it('Accept and Discard of a section do not touch the form fields', async () => {
      view();
      fireEvent.click(button('Accept'));
      await waitFor(() => expect(actions().accept.mutateAsync).toHaveBeenCalledTimes(1));
      fireEvent.click(button('Discard'));
      await waitFor(() =>
        expect(actions().discardItem.mutateAsync).toHaveBeenCalledWith({ id: 'd1', index: 0 })
      );
      expect(onFieldsWritten).not.toHaveBeenCalled();
      expect(actions().discardRun.mutate).not.toHaveBeenCalled();
    });

    it('a waiting section can be accepted and discarded: the server decides', async () => {
      hooks.run = run({ items: [item({ index: 1, number: 2, title: 'B', outcome: 'waiting' })] });
      view();
      const c = card('Section 2: B');
      expect(
        within(c).getByText(
          'Waits for section 1. Accept now writes it if every section before it is in the field; otherwise Accept is refused and names the section that must come first.'
        )
      ).toBeInTheDocument();
      fireEvent.click(within(c).getByRole('button', { name: 'Accept' }));
      await waitFor(() => expect(actions().accept.mutateAsync).toHaveBeenCalledTimes(1));
      expect(actions().accept.mutateAsync).toHaveBeenCalledWith({ id: 'd1', index: 1 });
      fireEvent.click(within(c).getByRole('button', { name: 'Discard' }));
      await waitFor(() => expect(actions().discardItem.mutateAsync).toHaveBeenCalledTimes(1));
      expect(actions().discardItem.mutateAsync).toHaveBeenCalledWith({ id: 'd1', index: 1 });
    });

    it('a waiting section names the first failed section before it; its 409 says what to do', async () => {
      hooks.run = run({
        items: [
          item({ index: 0, number: 1, verdict: 'failed', html: '', outcome: 'none' }),
          item({ index: 1, number: 2, title: 'B', outcome: 'written' }),
          item({ index: 2, number: 3, title: 'C', outcome: 'waiting' }),
        ],
      });
      actions().accept.mutateAsync.mockRejectedValueOnce(
        conflict({ code: 'SUMMARY_ITEM_NOT_PROPOSED', message: 'x' })
      );
      view();
      const c = card('Section 3: C');
      expect(within(c).getByText(/^Waits for section 1\./)).toBeInTheDocument();
      fireEvent.click(within(c).getByRole('button', { name: 'Accept' }));
      expect(await within(c).findByRole('alert')).toHaveTextContent(
        'Section 3 waits for section 1: regenerate section 1. Writing it by hand does not release this section: that takes a new paid Write Summary, which discards the proposals not accepted here.'
      );
      // Ничего не записано: форма не перечитывается.
      expect(onFieldsWritten).not.toHaveBeenCalled();
    });

    it('Accept of the full summary failed in the network: the server may have written — the field is reloaded', async () => {
      actions().accept.mutateAsync.mockRejectedValueOnce(new Error('offline'));
      hooks.run = run({ items: [full()] });
      view();
      fireEvent.click(button('Accept'));
      expect(await screen.findByRole('alert')).toHaveTextContent('The request failed');
      expect(onFieldsWritten).toHaveBeenCalledTimes(1);
      expect(onFieldsWritten).toHaveBeenCalledWith(['full']);
    });

    it('refusals that wrote nothing do not reload the field', async () => {
      for (const code of ['SUMMARY_WRITE_NOT_READY', 'SUMMARY_ITEM_NOT_PROPOSED']) {
        actions().accept.mutateAsync.mockRejectedValueOnce(conflict({ code, message: 'x' }));
        hooks.run = run({ items: [full()] });
        const { unmount } = view();
        fireEvent.click(button('Accept'));
        await screen.findByRole('alert');
        unmount();
      }
      expect(onFieldsWritten).not.toHaveBeenCalled();
    });

    it('the refusal of a text goes away when the text changes', async () => {
      actions().discardItem.mutateAsync.mockRejectedValueOnce(
        conflict({ code: 'SUMMARY_WRITE_NOT_READY', message: 'x' })
      );
      const { rerender } = view();
      fireEvent.click(button('Discard'));
      expect(await screen.findByRole('alert')).toHaveTextContent('The run is not ready any more');
      hooks.run = run({ items: [item({ html: '<p>Regenerated.</p>' })] });
      rerender(element());
      expect(screen.queryByRole('alert')).toBeNull();
    });

    it('409 SUMMARY_FIELD_CHANGED of the very short summary: what the field holds now; the form takes it', async () => {
      actions().accept.mutateAsync.mockRejectedValueOnce(
        conflict({
          code: 'SUMMARY_FIELD_CHANGED',
          message: 'x',
          current: { text: '<p>By hand.</p>' },
        })
      );
      hooks.run = run({ items: [item({ index: 5, target: 'brief', number: null, title: null })] });
      view();
      fireEvent.click(button('Accept'));
      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent('The field was changed after this proposal');
      expect(within(alert).getByText('By hand.')).toBeInTheDocument();
      expect(onFieldsWritten).toHaveBeenCalledTimes(1);
      expect(onFieldsWritten).toHaveBeenCalledWith(['brief']);
    });

    it('409 SUMMARY_FIELD_CHANGED of a section: its title and chapter now; the form is not touched', async () => {
      actions().accept.mutateAsync.mockRejectedValueOnce(
        conflict({
          code: 'SUMMARY_FIELD_CHANGED',
          message: 'x',
          current: { title: 'Renamed', text: null, readerChapter: 4 },
        })
      );
      view();
      fireEvent.click(button('Accept'));
      const alert = await screen.findByRole('alert');
      expect(within(alert).getByText('Title: Renamed, reader chapter 4')).toBeInTheDocument();
      expect(within(alert).getByText('(empty)')).toBeInTheDocument();
      expect(onFieldsWritten).not.toHaveBeenCalled();
    });

    it('409 SUMMARY_FIELD_CHANGED without the current text asks to reload the tab', async () => {
      actions().accept.mutateAsync.mockRejectedValueOnce(
        conflict({ code: 'SUMMARY_FIELD_CHANGED', message: 'x', current: null })
      );
      view();
      fireEvent.click(button('Accept'));
      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent('the server did not send the current text: reload the tab.');
      expect(within(alert).queryByText('(empty)')).toBeNull();
    });

    it('409 SUMMARY_FIELD_CHANGED with expectedNumber names the way out', async () => {
      actions().accept.mutateAsync.mockRejectedValueOnce(
        conflict({ code: 'SUMMARY_FIELD_CHANGED', message: 'x', expectedNumber: 2, current: null })
      );
      hooks.run = run({ items: [item({ index: 2, number: 3, title: 'C' })] });
      view();
      fireEvent.click(button('Accept'));
      expect(await screen.findByRole('alert')).toHaveTextContent(
        'Section 2 must come first: accept section 2 first; if it was discarded, regenerate it and accept it. A section written by hand does not count here.'
      );
    });

    it('409 SUMMARY_CHAPTER_CHANGE asks to confirm and repeats Accept with confirmChapterChange', async () => {
      const body = {
        code: 'SUMMARY_CHAPTER_CHANGE',
        message: 'x',
        number: 3,
        covers: { from: 3, to: 4 },
        willCover: { from: 3, to: 5 },
        sameChapterSections: [4],
      };
      actions().accept.mutateAsync.mockRejectedValueOnce(conflict(body));
      hooks.run = run({ items: [item({ index: 2, number: 3, title: 'C' })] });
      view();
      fireEvent.click(button('Accept'));
      expect(
        await screen.findByText(
          /Section 3 now covers chapters 3–4, will cover chapters 3–5\. Section 4 also covers some of chapters 3–5\./
        )
      ).toBeInTheDocument();
      expect(actions().accept.mutateAsync).toHaveBeenCalledTimes(1);
      fireEvent.click(within(dialog()).getByRole('button', { name: 'Accept' }));
      await waitFor(() => expect(actions().accept.mutateAsync).toHaveBeenCalledTimes(2));
      expect(actions().accept.mutateAsync).toHaveBeenLastCalledWith({
        id: 'd1',
        index: 2,
        confirmChapterChange: true,
      });
    });

    it('SUMMARY_CHAPTER_CHANGE: Cancel does not repeat Accept', async () => {
      actions().accept.mutateAsync.mockRejectedValueOnce(
        conflict({
          code: 'SUMMARY_CHAPTER_CHANGE',
          message: 'x',
          number: 1,
          covers: null,
          willCover: null,
          sameChapterSections: [],
        })
      );
      view();
      fireEvent.click(button('Accept'));
      fireEvent.click(
        await within(await screen.findByRole('dialog')).findByRole('button', { name: 'Cancel' })
      );
      expect(actions().accept.mutateAsync).toHaveBeenCalledTimes(1);
    });
  });

  describe('Regenerate', () => {
    it('the hint where the result comes is at the button itself, before the form opens', () => {
      view();
      expect(
        screen.getByText(
          'The result comes as a proposal unless the field is empty on an unpublished version.'
        )
      ).toBeInTheDocument();
    });

    it('sends the remark for the author', async () => {
      view();
      fireEvent.click(button('Regenerate'));
      const remark = screen.getByLabelText('Remark for the author (optional)');
      expect(remark).toHaveAttribute('maxLength', '2000');
      fireEvent.change(remark, { target: { value: '  Less about the weather.  ' } });
      fireEvent.click(button('Start regeneration'));
      await waitFor(() => expect(actions().regenerate.mutateAsync).toHaveBeenCalledTimes(1));
      expect(actions().regenerate.mutateAsync).toHaveBeenCalledWith({
        id: 'd1',
        index: 0,
        remark: 'Less about the weather.',
      });
    });

    it('without a remark goes without one; Cancel clears the typed remark', async () => {
      view();
      fireEvent.click(button('Regenerate'));
      fireEvent.change(screen.getByLabelText('Remark for the author (optional)'), {
        target: { value: 'Draft remark' },
      });
      fireEvent.click(button('Cancel'));
      fireEvent.click(button('Regenerate'));
      expect(screen.getByLabelText('Remark for the author (optional)')).toHaveValue('');
      fireEvent.click(button('Start regeneration'));
      await waitFor(() => expect(actions().regenerate.mutateAsync).toHaveBeenCalledTimes(1));
      expect(actions().regenerate.mutateAsync).toHaveBeenCalledWith({ id: 'd1', index: 0 });
    });

    it('a text being regenerated: «Regenerating…», its buttons are disabled; a failed regeneration keeps the text', () => {
      hooks.run = run({
        items: [item({ regenerating: true, regenFailedReason: 'DRAFT_INVALID_RESPONSE' })],
      });
      view();
      expect(screen.getByText('Regenerating…')).toBeInTheDocument();
      expect(button('Accept')).toBeDisabled();
      expect(button('Discard')).toBeDisabled();
      expect(screen.queryByRole('button', { name: 'Regenerate' })).toBeNull();
      expect(
        screen.getByText(
          'Regeneration failed, the previous text is kept: the model answered not in the expected form.'
        )
      ).toBeInTheDocument();
    });
  });

  describe('start', () => {
    const estimate = (patch: Partial<SummaryWriteEstimate> = {}): SummaryWriteEstimate => ({
      dossier: null,
      glossary: null,
      sections: 12,
      stageUsd: '2.9',
      upperBound: false,
      suggestedLimitUsd: '4.35',
      ...patch,
    });

    it('«Write Summary» is disabled on a pause and while the dossier is built first', () => {
      hooks.run = writing({
        operation: operation({ status: 'paused', pauseReason: 'CEILING_REACHED' }),
      });
      const { unmount } = view();
      expect(button('Write Summary')).toBeDisabled();
      unmount();
      hooks.run = writing({ waitingFor: 'dossier', plannedSections: null });
      view();
      expect(button('Write Summary')).toBeDisabled();
      expect(screen.getByRole('status')).toHaveTextContent('Building the dossier first');
    });

    it('«Write Summary» is disabled while the run is being written; the progress counts sections', () => {
      hooks.run = writing({ plannedSections: 12, sectionsDone: 3 });
      view();
      expect(button('Write Summary')).toBeDisabled();
      expect(screen.getByText(/being written: Write Summary is available/)).toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveTextContent('Writing: sections 3 of 12');
      expect(screen.queryByRole('button', { name: 'Discard run' })).toBeNull();
    });

    it('asks the estimate only when the window opens and starts', () => {
      hooks.estimate = estimate();
      hooks.run = null;
      view();
      expect(hooks.estimateEnabled.every((e) => !e)).toBe(true);
      fireEvent.click(button('Write Summary'));
      expect(screen.getByText(/The summary: up to \$2\.9 \(12 sections/)).toBeInTheDocument();
      fireEvent.click(button('Start'));
      expect(actions().start.mutate).toHaveBeenCalledTimes(1);
      expect(actions().start.mutate).toHaveBeenCalledWith({});
    });

    it('over a ready run the window names what is lost; Cancel starts nothing', () => {
      hooks.estimate = estimate();
      hooks.run = run({ items: [item(), item({ index: 1, number: 2, regenerating: true })] });
      view();
      fireEvent.click(button('Write Summary'));
      expect(
        within(dialog()).getByText(
          /This replaces the current run: 2 proposals not accepted will be discarded, 1 regeneration will be cancelled\./
        )
      ).toBeInTheDocument();
      fireEvent.click(within(dialog()).getByRole('button', { name: 'Cancel' }));
      expect(actions().start.mutate).not.toHaveBeenCalled();
    });

    it('a dossier the start will refuse DOSSIER_TOO_LONG: the text says so, «Start» is disabled', () => {
      const line = { estimateUsd: '0.5', suggestedLimitUsd: '0.75', upperBound: false };
      hooks.estimate = estimate({ dossier: { ...line, refusedTooLong: true } });
      view();
      fireEvent.click(button('Write Summary'));
      expect(within(dialog()).getByText(/will not be built/)).toBeInTheDocument();
      expect(button('Start')).toBeDisabled();
    });

    it('the run is not loaded yet or failed to load — no start; Retry reloads it', () => {
      hooks.loading = true;
      const { unmount } = view();
      expect(screen.queryByRole('button', { name: 'Write Summary' })).toBeNull();
      unmount();
      hooks.loading = false;
      hooks.loadError = true;
      view();
      expect(screen.queryByRole('button', { name: 'Write Summary' })).toBeNull();
      expect(screen.getByRole('alert')).toHaveTextContent('Failed to load the summary run.');
      fireEvent.click(button('Retry'));
      expect(hooks.refetch).toHaveBeenCalledTimes(1);
    });

    it('the start is on its way — the button is busy', () => {
      actions().start.isPending = true;
      view();
      expect(screen.getByText('Write Summary').closest('button')).toBeDisabled();
    });

    it('refusals in words; the ceiling links to LLM settings', () => {
      actions().start.error = conflict({ code: 'SOURCE_HAS_NO_CHAPTERS' });
      const { unmount } = view();
      expect(screen.getByRole('alert')).toHaveTextContent(
        'This version has no chapter text to write the summary from.'
      );
      unmount();
      actions().start.error = conflict({ code: 'LLM_CEILING_REACHED' });
      view();
      expect(screen.getByRole('alert')).toHaveTextContent('The spending ceiling is reached');
      expect(screen.getByRole('link', { name: 'LLM settings' })).toHaveAttribute(
        'href',
        '/admin/en/llm-settings'
      );
    });

    it('DOSSIER_STALE — «Rebuild dossier» with its estimate; a refused dossier is not rebuilt', () => {
      actions().start.error = conflict({ code: 'DOSSIER_STALE' });
      const { unmount } = view();
      expect(screen.getByRole('alert')).toHaveTextContent('rebuild the dossier');
      fireEvent.click(button('Rebuild dossier'));
      expect(screen.getByText(/from 3 chapters: up to \$0\.5/)).toBeInTheDocument();
      fireEvent.click(button('Rebuild'));
      expect(actions().rebuildDossier.mutate).toHaveBeenCalledTimes(1);
      unmount();
      hooks.dossierRefused = true;
      view();
      fireEvent.click(button('Rebuild dossier'));
      expect(button('Rebuild')).toBeDisabled();
    });
  });

  describe('the run being written', () => {
    it('paused on the ceiling: the reason, the link and «Continue»; a refused Continue says why', () => {
      hooks.run = writing({
        operation: operation({ status: 'paused', pauseReason: 'CEILING_REACHED' }),
      });
      actions().resume.error = conflict({ code: 'LLM_OPERATION_NOT_RESUMABLE' });
      (actions().resume as Mutation & { variables?: unknown }).variables = { id: 'op-1' };
      view();
      expect(screen.getByRole('status')).toHaveTextContent('the spending ceiling is reached');
      expect(screen.getByRole('link', { name: 'LLM settings' })).toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveTextContent('The run cannot be resumed');
      fireEvent.click(button('Continue'));
      expect(actions().resume.mutate).toHaveBeenCalledTimes(1);
      expect(actions().resume.mutate).toHaveBeenCalledWith({ id: 'op-1' });
    });

    it('paused on the limit: «Continue» with a new limit', () => {
      hooks.run = writing({
        operation: operation({ status: 'paused', pauseReason: 'LIMIT_REACHED' }),
      });
      view();
      fireEvent.change(screen.getByLabelText('New limit of the run'), { target: { value: '3' } });
      expect(screen.queryByRole('button', { name: 'Resume' })).toBeNull();
      fireEvent.click(button('Continue'));
      expect(actions().resume.mutate).toHaveBeenCalledTimes(1);
      expect(actions().resume.mutate).toHaveBeenCalledWith({ id: 'op-1', limitUsd: '3' });
    });

    it('paused: «Discard run» calls discard-run after confirmation', () => {
      hooks.run = writing({
        operation: operation({ status: 'paused', pauseReason: 'CEILING_REACHED' }),
      });
      view();
      fireEvent.click(button('Discard run'));
      expect(actions().discardRun.mutate).not.toHaveBeenCalled();
      fireEvent.click(within(dialog()).getByRole('button', { name: 'Discard' }));
      expect(actions().discardRun.mutate).toHaveBeenCalledTimes(1);
      expect(actions().discardRun.mutate).toHaveBeenCalledWith('d1');
    });

    it('failed run: the reason and «Discard run»; a ready run has no «Discard run»', () => {
      hooks.run = run({ status: 'failed', failedReason: 'DRAFT_DOSSIER_MISSING', items: [] });
      const { unmount } = view();
      expect(screen.getByRole('alert')).toHaveTextContent('Failed: the dossier is gone.');
      expect(button('Discard run')).toBeInTheDocument();
      unmount();
      hooks.run = run();
      view();
      expect(screen.queryByRole('button', { name: 'Discard run' })).toBeNull();
    });
  });

  describe('Accept all', () => {
    it('is not available while a section changes reader chapters', () => {
      hooks.run = run({ chapterChanges: [3] });
      view();
      expect(button('Accept all')).toBeDisabled();
      expect(screen.getByText(/section 3 moves to other reader chapters/)).toBeInTheDocument();
    });

    it('accepts and takes the accepted fields into the form; a regenerated text is skipped', async () => {
      hooks.run = run({
        items: [
          item(),
          full(),
          item({ index: 5, target: 'brief', number: null, title: null, regenerating: true }),
        ],
      });
      view();
      fireEvent.click(button('Accept all'));
      await waitFor(() => expect(onFieldsWritten).toHaveBeenCalledTimes(1));
      expect(onFieldsWritten).toHaveBeenCalledWith(['full']);
      expect(actions().acceptAll.mutateAsync).toHaveBeenCalledTimes(1);
      expect(actions().acceptAll.mutateAsync).toHaveBeenCalledWith('d1');
    });

    it('is available with waiting sections only', () => {
      hooks.run = run({ items: [item({ outcome: 'waiting', number: 2 })] });
      view();
      expect(button('Accept all')).toBeEnabled();
    });

    it('while Accept all runs and when the run cannot be reloaded the texts are locked', () => {
      actions().acceptAll.isPending = true;
      const { unmount } = view();
      expect(button('Accept')).toBeDisabled();
      expect(button('Regenerate')).toBeDisabled();
      unmount();
      actions().acceptAll.isPending = false;
      hooks.pollError = true;
      view();
      expect(button('Accept')).toBeDisabled();
      expect(button('Discard')).toBeDisabled();
      expect(button('Accept all')).toBeDisabled();
    });

    it('a 409 after some: what is accepted, where it stopped and what the field holds now', async () => {
      hooks.run = run({
        items: [item(), full(), item({ index: 5, target: 'brief', number: null, title: null })],
      });
      actions().acceptAll.mutateAsync.mockRejectedValueOnce(
        conflict({
          code: 'SUMMARY_FIELD_CHANGED',
          message: 'x',
          current: { text: '<p>Edited full.</p>' },
          acceptedIndexes: [0],
        })
      );
      view();
      fireEvent.click(button('Accept all'));
      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent('Summary: the field was changed after this proposal');
      expect(within(alert).getByText('Edited full.')).toBeInTheDocument();
      expect(
        within(alert).getByText('Already accepted: Section 1: The storm.')
      ).toBeInTheDocument();
      // Принят раздел (не поле формы), полный изменён на сервере: форма берёт только полный.
      expect(onFieldsWritten).toHaveBeenCalledTimes(1);
      expect(onFieldsWritten).toHaveBeenCalledWith(['full']);
    });

    it.each(['SUMMARY_ITEM_NOT_PROPOSED', 'SUMMARY_WRITE_NOT_READY'])(
      'a «nothing written» code %s after some accepted: the accepted fields still go into the form',
      async (code) => {
        hooks.run = run({
          items: [item(), full(), item({ index: 5, target: 'brief', number: null, title: null })],
        });
        // Полный принят, «Очень кратко» отброшено или ход сброшен в другой вкладке.
        actions().acceptAll.mutateAsync.mockRejectedValueOnce(
          conflict({ code, message: 'x', acceptedIndexes: [0, 4] })
        );
        view();
        fireEvent.click(button('Accept all'));
        await screen.findByRole('alert');
        expect(onFieldsWritten).toHaveBeenCalledTimes(1);
        expect(onFieldsWritten).toHaveBeenCalledWith(['full']);
      }
    );

    it('a 409 with expectedNumber names the way out', async () => {
      actions().acceptAll.mutateAsync.mockRejectedValueOnce(
        conflict({
          code: 'SUMMARY_FIELD_CHANGED',
          message: 'x',
          current: null,
          expectedNumber: 2,
          acceptedIndexes: [],
        })
      );
      hooks.run = run({ items: [item({ number: 3, title: 'C' })] });
      view();
      fireEvent.click(button('Accept all'));
      expect(await screen.findByRole('alert')).toHaveTextContent(
        'Section 3: C: section 2 must come first'
      );
    });

    it('ACCEPT_ALL_CHAPTER_CHANGE says to accept those sections one by one', async () => {
      actions().acceptAll.mutateAsync.mockRejectedValueOnce(
        conflict({ code: 'ACCEPT_ALL_CHAPTER_CHANGE', message: 'x' })
      );
      view();
      fireEvent.click(button('Accept all'));
      expect(await screen.findByRole('alert')).toHaveTextContent(
        'accept those sections one by one'
      );
    });

    it('a network failure may have written: every field it touches is reloaded', async () => {
      hooks.run = run({
        items: [item(), full(), item({ index: 5, target: 'brief', number: null, title: null })],
      });
      actions().acceptAll.mutateAsync.mockRejectedValueOnce(new Error('offline'));
      view();
      fireEvent.click(button('Accept all'));
      expect(await screen.findByRole('alert')).toHaveTextContent('The request failed');
      expect(onFieldsWritten).toHaveBeenCalledTimes(1);
      expect(onFieldsWritten).toHaveBeenCalledWith(['full', 'brief']);
    });

    it('a refusal midway names the text it stopped at, by the texts at the click (F06-5c)', async () => {
      // Встали на «Очень кратко» (отброшено в другой вкладке); перечитанный ход его уже не предлагает.
      hooks.run = run({
        items: [
          item({ outcome: 'accepted' }),
          full(),
          item({ index: 5, target: 'brief', number: null, title: null }),
        ],
      });
      actions().acceptAll.mutateAsync.mockImplementationOnce(() => {
        hooks.run = run({
          items: [
            item({ outcome: 'accepted' }),
            full({ outcome: 'accepted' }),
            item({ index: 5, target: 'brief', number: null, title: null, outcome: 'discarded' }),
          ],
        });
        return Promise.reject(
          conflict({ code: 'SUMMARY_ITEM_NOT_PROPOSED', message: 'x', acceptedIndexes: [4] })
        );
      });
      const { rerender } = view();
      fireEvent.click(button('Accept all'));
      await screen.findByRole('alert');
      rerender(element());
      // Раздел уже принят: встали на «Очень кратко» — по текстам на момент нажатия.
      expect(screen.getByText('Stopped at: Very short summary.')).toBeInTheDocument();
      expect(screen.getByText('Already accepted: Summary.')).toBeInTheDocument();
    });

    it('after a refusal with nothing left to accept, Accept all is off (F06-5c)', async () => {
      hooks.run = run({
        items: [full(), item({ index: 5, target: 'brief', number: null, title: null })],
      });
      actions().acceptAll.mutateAsync.mockImplementationOnce(() => {
        hooks.run = run({
          items: [
            full({ outcome: 'accepted' }),
            item({ index: 5, target: 'brief', number: null, title: null, outcome: 'discarded' }),
          ],
        });
        return Promise.reject(
          conflict({ code: 'SUMMARY_ITEM_NOT_PROPOSED', message: 'x', acceptedIndexes: [4] })
        );
      });
      const { rerender } = view();
      fireEvent.click(button('Accept all'));
      await screen.findByRole('alert');
      rerender(element());
      expect(button('Accept all')).toBeDisabled();
    });

    it('Discard of a text clears the refusal of Accept all (F06-5c)', async () => {
      hooks.run = run({
        items: [full(), item({ index: 5, target: 'brief', number: null, title: null })],
      });
      actions().acceptAll.mutateAsync.mockRejectedValueOnce(
        conflict({ code: 'SUMMARY_ITEM_NOT_PROPOSED', message: 'x', acceptedIndexes: [] })
      );
      view();
      fireEvent.click(button('Accept all'));
      await screen.findByText(/no longer a proposal/);
      fireEvent.click(within(card('Summary')).getByRole('button', { name: 'Discard' }));
      await waitFor(() =>
        expect(screen.queryByText(/no longer a proposal/)).not.toBeInTheDocument()
      );
    });

    it('a chapter change refusal wrote nothing: the form is not touched', async () => {
      hooks.run = run({ items: [full()] });
      actions().acceptAll.mutateAsync.mockRejectedValueOnce(
        conflict({ code: 'ACCEPT_ALL_CHAPTER_CHANGE', message: 'x' })
      );
      view();
      fireEvent.click(button('Accept all'));
      await screen.findByRole('alert');
      expect(onFieldsWritten).not.toHaveBeenCalled();
    });

    it('the refusal goes away after a single Accept and with a new run', async () => {
      const refuse = () =>
        actions().acceptAll.mutateAsync.mockRejectedValueOnce(
          conflict({ code: 'ACCEPT_ALL_CHAPTER_CHANGE', message: 'x' })
        );
      hooks.run = run({ items: [item(), item({ index: 1, number: 2, title: 'B' })] });
      refuse();
      const { rerender } = view();
      fireEvent.click(button('Accept all'));
      expect(await screen.findByText(/accept those sections one by one/)).toBeInTheDocument();
      fireEvent.click(within(card('Section 1: The storm')).getByRole('button', { name: 'Accept' }));
      await waitFor(() =>
        expect(screen.queryByText(/accept those sections one by one/)).toBeNull()
      );

      refuse();
      fireEvent.click(button('Accept all'));
      expect(await screen.findByText(/accept those sections one by one/)).toBeInTheDocument();
      hooks.run = run({ id: 'd2', items: [item()] });
      rerender(element());
      expect(screen.queryByText(/accept those sections one by one/)).toBeNull();
    });
  });

  describe('a failed section', () => {
    it('the full and very short summaries wait for it: the run says so', () => {
      hooks.run = run({
        items: [
          item({ index: 0, number: 1, outcome: 'written' }),
          item({ index: 1, number: 2, verdict: 'failed', html: '', outcome: 'none' }),
        ],
      });
      const { unmount } = view();
      expect(
        screen.getByText(
          'Full and very short summaries wait for section 2: regenerate it. A section written by hand does not finish this run: that takes a new paid Write Summary, which discards the proposals not accepted here.'
        )
      ).toBeInTheDocument();
      unmount();
      hooks.run = run({
        items: [
          item({ index: 1, number: 2, verdict: 'failed', html: '', outcome: 'none' }),
          full({ outcome: 'written' }),
        ],
      });
      view();
      expect(screen.queryByText(/Full and very short summaries wait/)).toBeNull();
    });
  });

  describe('texts written by the run itself', () => {
    it('in StrictMode the first answer sends its written fields once, a new text once more', async () => {
      hooks.run = writing({ items: [full({ outcome: 'written' })] });
      const strict = () => <StrictMode>{element()}</StrictMode>;
      const { rerender } = render(strict());
      expect(onFieldsWritten.mock.calls).toEqual([[['full']]]);
      expect(actions().refreshFields).not.toHaveBeenCalled();
      hooks.run = writing({
        items: [
          full({ outcome: 'written' }),
          item({ index: 5, target: 'brief', number: null, title: null, outcome: 'written' }),
        ],
      });
      rerender(strict());
      await waitFor(() => expect(onFieldsWritten).toHaveBeenCalledTimes(2));
      expect(onFieldsWritten.mock.calls).toEqual([[['full']], [['brief']]]);
      expect(actions().refreshFields).toHaveBeenCalledTimes(1);
    });

    it('the first answer with a written full summary sends it to the form: the form may come from the cache', () => {
      hooks.run = run({
        items: [
          full({ outcome: 'written' }),
          item({ index: 5, target: 'brief', number: null, title: null, outcome: 'written' }),
          item({ outcome: 'written' }),
        ],
      });
      view();
      expect(onFieldsWritten).toHaveBeenCalledTimes(1);
      expect(onFieldsWritten).toHaveBeenCalledWith(['full', 'brief']);
      // Записанный ходом раздел: список разделов перечитывается и на первом ответе (F06-5c).
      expect(actions().refreshFields).toHaveBeenCalledTimes(1);
    });

    it('another version: its first answer is a first answer again', () => {
      hooks.run = run({ items: [full({ outcome: 'written' })] });
      const { rerender } = view();
      expect(onFieldsWritten).toHaveBeenCalledTimes(1);
      hooks.run = run({ id: 'd9', bookVersionId: 'v2', items: [full({ outcome: 'written' })] });
      rerender(<SummaryWrite versionId="v2" lang="en" onFieldsWritten={onFieldsWritten} />);
      // Как первый ответ: поля в форму, разделы не перечитываются.
      expect(onFieldsWritten).toHaveBeenCalledTimes(2);
      expect(actions().refreshFields).not.toHaveBeenCalled();
    });

    it('the first load reloads the sections once; a new written full summary goes into the form', async () => {
      hooks.run = writing({ items: [item({ outcome: 'written' })] });
      const { rerender } = view();
      rerender(element());
      expect(actions().refreshFields).toHaveBeenCalledTimes(1);
      hooks.run = writing({ items: [item({ outcome: 'written' }), full({ outcome: 'written' })] });
      rerender(element());
      await waitFor(() => expect(onFieldsWritten).toHaveBeenCalledWith(['full']));
      expect(onFieldsWritten).toHaveBeenCalledTimes(1);
      expect(actions().refreshFields).toHaveBeenCalledTimes(2);
    });

    it('a regeneration that writes the same number again with another text is noticed (F06-5c)', async () => {
      hooks.run = writing({ items: [full({ outcome: 'written', html: '<p>One.</p>' })] });
      const { rerender } = view();
      expect(onFieldsWritten).toHaveBeenCalledTimes(1);
      hooks.run = writing({ items: [full({ outcome: 'written', html: '<p>Two.</p>' })] });
      rerender(element());
      await waitFor(() => expect(onFieldsWritten).toHaveBeenCalledTimes(2));
      expect(onFieldsWritten).toHaveBeenLastCalledWith(['full']);
    });

    const regen = (patch: Partial<SummaryWriteItem>) =>
      item({ regenerating: true, regenOperationId: 'op-regen', ...patch });

    it('a paused regeneration: the reason in words and «Continue» resumes that operation (F06-5c)', () => {
      hooks.run = run({
        items: [regen({ regenOperationStatus: 'paused', regenPauseReason: 'CEILING_REACHED' })],
      });
      view();
      expect(
        screen.getByText(/Regeneration paused: the spending ceiling is reached/)
      ).toBeInTheDocument();
      fireEvent.click(button('Continue'));
      expect(actions().resume.mutate).toHaveBeenCalledTimes(1);
      expect(actions().resume.mutate).toHaveBeenCalledWith({ id: 'op-regen' });
    });

    it('paused on its limit: «Continue» goes with a new limit (F06-5c)', () => {
      hooks.run = run({
        items: [regen({ regenOperationStatus: 'paused', regenPauseReason: 'LIMIT_REACHED' })],
      });
      view();
      fireEvent.change(screen.getByLabelText('New limit of the regeneration'), {
        target: { value: '2.5' },
      });
      fireEvent.click(button('Continue'));
      expect(actions().resume.mutate).toHaveBeenCalledTimes(1);
      expect(actions().resume.mutate).toHaveBeenCalledWith({ id: 'op-regen', limitUsd: '2.5' });
    });

    it('a refusal of the own operation is shown, of another operation is not (F06-5c)', () => {
      hooks.run = run({
        items: [regen({ regenOperationStatus: 'paused', regenPauseReason: 'STEP_FAILED' })],
      });
      const resume = actions().resume as Mutation & { variables?: unknown };
      resume.error = conflict({ code: 'LLM_OPERATION_NOT_RESUMABLE' });
      resume.variables = { id: 'op-other' };
      const { unmount } = view();
      expect(
        screen.queryByText('The regeneration is not paused any more.')
      ).not.toBeInTheDocument();
      unmount();
      resume.variables = { id: 'op-regen' };
      view();
      expect(screen.getByRole('alert')).toHaveTextContent(
        'The regeneration is not paused any more.'
      );
    });

    it('a paused regeneration shows no «Regenerating…»: the pause is said once (F06-5c)', () => {
      hooks.run = run({
        items: [regen({ regenOperationStatus: 'paused', regenPauseReason: 'STEP_FAILED' })],
      });
      view();
      expect(screen.queryByText('Regenerating…')).not.toBeInTheDocument();
      expect(screen.getByText(/Regeneration paused/)).toBeInTheDocument();
    });

    it('while Accept all runs or another Continue is on its way: the reason without a button (F06-5c)', () => {
      hooks.run = run({
        items: [regen({ regenOperationStatus: 'paused', regenPauseReason: 'STEP_FAILED' })],
      });
      actions().acceptAll.isPending = true;
      const { unmount } = view();
      expect(screen.queryByRole('button', { name: 'Continue' })).not.toBeInTheDocument();
      expect(screen.getByText(/Regeneration paused/)).toBeInTheDocument();
      unmount();
      actions().acceptAll.isPending = false;
      const resume = actions().resume as Mutation & { variables?: unknown };
      resume.isPending = true;
      resume.variables = { id: 'op-other' };
      view();
      expect(screen.queryByRole('button', { name: 'Continue' })).not.toBeInTheDocument();
    });

    it('a 503 LLM_DISABLED of «Continue» is said here (no common toast); another 5xx is not (F06-5c)', () => {
      hooks.run = run({
        items: [regen({ regenOperationStatus: 'paused', regenPauseReason: 'STEP_FAILED' })],
      });
      const resume = actions().resume as Mutation & { variables?: unknown };
      resume.variables = { id: 'op-regen' };
      resume.error = new ApiError({
        statusCode: 503,
        message: 'off',
        data: { code: 'LLM_DISABLED' },
      });
      const { unmount } = view();
      expect(screen.getByRole('alert')).toBeInTheDocument();
      unmount();
      resume.error = new ApiError({ statusCode: 502, message: 'bad gateway' });
      view();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('a running regeneration (not paused) or one without an operation has no «Continue» (F06-5c)', () => {
      hooks.run = run({
        items: [
          regen({ regenOperationStatus: 'active' }),
          item({ index: 2, number: 2, regenerating: true, regenOperationId: null }),
        ],
      });
      view();
      expect(screen.queryByRole('button', { name: 'Continue' })).not.toBeInTheDocument();
      expect(screen.queryByText(/Regeneration paused/)).not.toBeInTheDocument();
    });

    it('the first answer with only the full and very short summary does not reload the sections', () => {
      hooks.run = run({
        items: [
          full({ outcome: 'written' }),
          item({ index: 5, target: 'brief', number: null, title: null, outcome: 'written' }),
        ],
      });
      view();
      expect(onFieldsWritten).toHaveBeenCalledTimes(1);
      expect(actions().refreshFields).not.toHaveBeenCalled();
    });

    it('a section names its reader chapter; no chapter — says so (F06-5c)', () => {
      hooks.run = run({
        items: [item({ readerChapter: 3 }), item({ index: 2, number: 2, readerChapter: null })],
      });
      view();
      expect(screen.getByText('Reader chapter: 3.')).toBeInTheDocument();
      expect(screen.getByText('Reader chapter: none in this version.')).toBeInTheDocument();
    });

    it('a new written section reloads the summary but not the form fields', async () => {
      hooks.run = writing();
      const { rerender } = view();
      hooks.run = writing({ items: [item({ outcome: 'written' })] });
      rerender(element());
      await waitFor(() => expect(actions().refreshFields).toHaveBeenCalledTimes(1));
      expect(onFieldsWritten).not.toHaveBeenCalled();
    });

    it('a new run on the open tab: its written texts are new', async () => {
      hooks.run = run({ items: [full({ outcome: 'written' })] });
      const { rerender } = view();
      hooks.run = writing({ id: 'd2', items: [full({ outcome: 'written' })] });
      rerender(element());
      await waitFor(() => expect(onFieldsWritten).toHaveBeenCalledTimes(2));
      // Первый ответ (ход d1) и новый ход d2 — оба раза только полный.
      expect(onFieldsWritten).toHaveBeenNthCalledWith(1, ['full']);
      expect(onFieldsWritten).toHaveBeenNthCalledWith(2, ['full']);
    });
  });

  describe('refusals of another run', () => {
    it('Continue and Discard run refusals are shown only for their own run', () => {
      hooks.run = writing({
        operation: operation({ id: 'op-2', status: 'paused', pauseReason: 'CEILING_REACHED' }),
      });
      actions().resume.error = conflict({ code: 'LLM_OPERATION_NOT_RESUMABLE' });
      (actions().resume as Mutation & { variables?: unknown }).variables = { id: 'op-1' };
      actions().discardRun.error = conflict({ code: 'SUMMARY_WRITE_NOT_READY' });
      (actions().discardRun as Mutation & { variables?: unknown }).variables = 'd0';
      const { unmount } = view();
      expect(screen.queryByRole('alert')).toBeNull();
      unmount();
      (actions().discardRun as Mutation & { variables?: unknown }).variables = 'd1';
      view();
      expect(screen.getByRole('alert')).toHaveTextContent('The run is not ready any more');
    });
  });
});
