import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SummaryDraft, ApplyDraftText } from '@/components/admin/books/SummaryTab/SummaryDraft';
import { ApiError } from '@/types/api';
import type { ContentDraft, ContentDraftEstimate, LlmOperation } from '@/types/api-schema';

/**
 * F05-10: заготовка шага Summary из досье — кнопка с оценкой, ход фоном (досье, глоссарий,
 * разделы), пауза операции с причиной, отказ, «перестроить досье» при `DOSSIER_STALE`;
 * подстановка в заполненное поле — только после подтверждения. Хуки подменены.
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
  draft: null as unknown,
  estimate: undefined as unknown,
  actions: {} as Record<string, ReturnType<typeof mutation>>,
  estimateEnabled: [] as boolean[],
  estimateError: null as unknown,
  dossierRefused: false,
}));

vi.mock('@/api/hooks', () => ({
  useContentDraft: () => ({ data: { draft: hooks.draft }, isError: false, refetch: vi.fn() }),
  useContentDraftActions: () => hooks.actions,
  useContentDraftEstimate: (_v: string, _k: string, enabled: boolean) => {
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

const operation = (patch: Partial<LlmOperation> = {}): LlmOperation => ({
  id: 'op-1',
  kind: 'draft',
  status: 'active',
  pauseReason: null,
  bookVersionId: 'v1',
  limitUsd: '1',
  reservedUsd: '0',
  spentUsd: '0',
  createdAt: '2026-10-26T00:00:00.000Z',
  updatedAt: '2026-10-26T00:00:00.000Z',
  ...patch,
});

const draft = (patch: Partial<ContentDraft> = {}): ContentDraft => ({
  id: 'd1',
  bookVersionId: 'v1',
  kind: 'summary_sections',
  status: 'building',
  language: 'en',
  failedReason: null,
  waitingFor: null,
  operation: operation(),
  model: null,
  plannedSections: null,
  sections: [],
  addedSections: [],
  text: null,
  question: null,
  analysis: null,
  droppedQuotes: null,
  motifs: null,
  dossierLanguage: null,
  analysisUpdatedAt: null,
  createdAt: '2026-10-26T00:00:00.000Z',
  updatedAt: '2026-10-26T00:00:00.000Z',
  ...patch,
});

const view = (blockedHint: string | null = null) => (
  <SummaryDraft versionId="v1" kind="summary_sections" lang="en" blockedHint={blockedHint}>
    {(d) => <div data-testid="result">{d.status}</div>}
  </SummaryDraft>
);

const button = () => screen.getByRole('button', { name: 'Draft sections from dossier' });

describe('SummaryDraft', () => {
  beforeEach(() => {
    hooks.draft = null;
    hooks.estimate = undefined;
    hooks.estimateEnabled.length = 0;
    hooks.estimateError = null;
    hooks.dossierRefused = false;
    hooks.actions = {
      start: mutation(),
      discard: mutation(),
      resume: mutation(),
      markAdded: mutation(),
      rebuildDossier: mutation(),
    };
  });

  it('the step before is not saved — the button is disabled with the hint', () => {
    render(view('Save the summary sections first.'));
    expect(button()).toBeDisabled();
    expect(screen.getByText('Save the summary sections first.')).toBeInTheDocument();
  });

  it('start: the estimate is asked only when the confirmation opens and shows the dossier line', () => {
    hooks.estimate = {
      kind: 'summary_sections',
      dossier: { estimateUsd: '0.5', suggestedLimitUsd: '0.75', upperBound: false },
      glossary: null,
      sections: null,
      stageUsd: '0.2',
      upperBound: true,
      suggestedLimitUsd: '0.75',
    } satisfies ContentDraftEstimate;
    render(view());
    expect(hooks.estimateEnabled.every((e) => !e)).toBe(true);
    fireEvent.click(button());
    expect(screen.getByText(/The dossier is built first: up to \$0\.5/)).toBeInTheDocument();
    expect(screen.queryByText(/glossary/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    expect(hooks.actions.start.mutate).toHaveBeenCalledTimes(1);
    expect(hooks.actions.start.mutate).toHaveBeenCalledWith({});
  });

  it('building: waits for the dossier, then for the glossary, then counts sections; the button is disabled', () => {
    hooks.draft = draft({ waitingFor: 'dossier' });
    const { rerender } = render(view());
    expect(screen.getByRole('status')).toHaveTextContent('Building the dossier first');
    expect(button()).toBeDisabled();
    hooks.draft = draft({ waitingFor: 'glossary' });
    rerender(view());
    expect(screen.getByRole('status')).toHaveTextContent(
      'Building the glossary of this language first'
    );
    hooks.draft = draft({ plannedSections: 3, sections: [] });
    rerender(view());
    expect(screen.getByRole('status')).toHaveTextContent('0 of 3 sections');
  });

  it('paused on the ceiling — the reason and the LLM settings link; on the limit — resume with a new limit', () => {
    hooks.draft = draft({
      operation: operation({ status: 'paused', pauseReason: 'CEILING_REACHED' }),
    });
    const { unmount } = render(view());
    expect(screen.getByRole('status')).toHaveTextContent('the spending ceiling is reached');
    expect(screen.getByRole('link', { name: 'LLM settings' })).toHaveAttribute(
      'href',
      '/admin/en/llm-settings'
    );
    unmount();
    hooks.draft = draft({
      operation: operation({ status: 'paused', pauseReason: 'LIMIT_REACHED' }),
    });
    render(view());
    fireEvent.change(screen.getByLabelText('New limit of the draft'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Resume' }));
    expect(hooks.actions.resume.mutate).toHaveBeenCalledTimes(1);
    expect(hooks.actions.resume.mutate).toHaveBeenCalledWith({ id: 'op-1', limitUsd: '2' });
  });

  it('failed — the reason in words; ready — the result and discard', () => {
    hooks.draft = draft({ status: 'failed', failedReason: 'DRAFT_INVALID_RESPONSE' });
    const { unmount } = render(view());
    expect(screen.getByRole('alert')).toHaveTextContent(
      'the model answered not in the expected form'
    );
    unmount();
    hooks.draft = draft({ status: 'ready' });
    render(view());
    expect(screen.getByTestId('result')).toHaveTextContent('ready');
    fireEvent.click(screen.getByRole('button', { name: 'Discard draft' }));
    // Оплаченное выбрасывается только после подтверждения.
    expect(hooks.actions.discard.mutate).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Discard' }));
    expect(hooks.actions.discard.mutate).toHaveBeenCalledTimes(1);
    expect(hooks.actions.discard.mutate).toHaveBeenCalledWith('d1');
  });

  it('DOSSIER_STALE on start — the refusal and «Rebuild dossier» with its estimate', () => {
    hooks.actions.start.error = new ApiError({
      statusCode: 409,
      message: 'stale',
      data: { code: 'DOSSIER_STALE' },
    });
    render(view());
    expect(screen.getByRole('alert')).toHaveTextContent('rebuild the dossier');
    fireEvent.click(screen.getByRole('button', { name: 'Rebuild dossier' }));
    expect(screen.getByText(/from 3 chapters: up to \$0\.5/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Rebuild' }));
    expect(hooks.actions.rebuildDossier.mutate).toHaveBeenCalledTimes(1);
  });
  it('a dossier the start will refuse DOSSIER_TOO_LONG: «Rebuild» says it will not be built and is disabled (T147)', () => {
    hooks.dossierRefused = true;
    hooks.actions.start.error = new ApiError({
      statusCode: 409,
      message: 'stale',
      data: { code: 'DOSSIER_STALE' },
    });
    render(view());
    fireEvent.click(screen.getByRole('button', { name: 'Rebuild dossier' }));
    expect(screen.getByText(/The dossier will not be built/)).toBeInTheDocument();
    expect(screen.queryByText(/up to \$0\.5/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Rebuild' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Rebuild' }));
    expect(hooks.actions.rebuildDossier.mutate).not.toHaveBeenCalled();
  });

  it('the estimate did not come — Start is disabled; the stale dossier keeps «Rebuild dossier» after Cancel', () => {
    hooks.estimateError = new ApiError({
      statusCode: 409,
      message: 'stale',
      data: { code: 'DOSSIER_STALE' },
    });
    render(view());
    fireEvent.click(button());
    expect(screen.getByRole('button', { name: 'Start' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByRole('button', { name: 'Rebuild dossier' })).toBeInTheDocument();
    expect(hooks.actions.start.mutate).not.toHaveBeenCalled();
  });

  it('a failed sections draft still shows the sections built before the refusal', () => {
    hooks.draft = draft({ status: 'failed', failedReason: 'DRAFT_TOO_LONG' });
    render(view());
    expect(screen.getByRole('alert')).toHaveTextContent('too long');
    expect(screen.getByTestId('result')).toHaveTextContent('failed');
  });
  it('discard of a building draft - cancel keeps it', () => {
    hooks.draft = draft();
    render(view());
    fireEvent.click(screen.getByRole('button', { name: 'Discard draft' }));
    expect(screen.getByText(/Stop building this draft/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(hooks.actions.discard.mutate).not.toHaveBeenCalled();
  });

  it('the cards get the server mark of their draft', () => {
    hooks.draft = draft({ status: 'ready' });
    render(
      <SummaryDraft versionId="v1" kind="summary_sections" lang="en" blockedHint={null}>
        {(_d, tools) => (
          <button type="button" onClick={() => void tools.markAdded(3)}>
            mark
          </button>
        )}
      </SummaryDraft>
    );
    fireEvent.click(screen.getByRole('button', { name: 'mark' }));
    expect(hooks.actions.markAdded.mutateAsync).toHaveBeenCalledTimes(1);
    expect(hooks.actions.markAdded.mutateAsync).toHaveBeenCalledWith({
      id: 'd1',
      sectionNumber: 3,
    });
  });
});

describe('ApplyDraftText', () => {
  it('an empty field is filled at once', () => {
    const onUse = vi.fn();
    render(<ApplyDraftText text="<p>Draft.</p>" current="<p></p>" field="Summary" onUse={onUse} />);
    fireEvent.click(screen.getByRole('button', { name: /Put the draft/ }));
    expect(onUse).toHaveBeenCalledTimes(1);
    expect(onUse).toHaveBeenCalledWith('<p>Draft.</p>');
  });

  it('a filled field is replaced only after the confirmation that shows the draft', () => {
    const onUse = vi.fn();
    render(
      <ApplyDraftText
        text="<p>Draft text.</p>"
        current="<p>Mine.</p>"
        field="Summary"
        onUse={onUse}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /Put the draft/ }));
    expect(onUse).not.toHaveBeenCalled();
    expect(screen.getByText(/The draft begins: “Draft text\.”/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Replace' }));
    expect(onUse).toHaveBeenCalledTimes(1);
    expect(onUse).toHaveBeenCalledWith('<p>Draft text.</p>');
  });

  it('a filled field: Cancel keeps it', () => {
    const onUse = vi.fn();
    render(
      <ApplyDraftText text="<p>New.</p>" current="<p>Mine.</p>" field="Summary" onUse={onUse} />
    );
    fireEvent.click(screen.getByRole('button', { name: /Put the draft/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onUse).not.toHaveBeenCalled();
  });
});
