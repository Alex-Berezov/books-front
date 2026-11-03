import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ContentDraftBlock } from '@/components/admin/books/ContentDraft';
import { ApiError } from '@/types/api';
import type { ContentDraft, ContentDraftEstimate, LlmOperation } from '@/types/api-schema';

/**
 * Общая оболочка заготовки из досье на виде `analysis` (F05-11): кнопка с оценкой, ход фоном
 * (досье, глоссарий), пауза операции с причиной и «Resume», отказ, «перестроить досье» при
 * `DOSSIER_STALE`, «Discard draft» с подтверждением. Случаи перенесены из теста снятой
 * заготовки Summary (F05-10 → F06-3). Хуки подменены.
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
  kind: 'analysis',
  status: 'building',
  language: 'en',
  failedReason: null,
  waitingFor: null,
  operation: operation(),
  model: null,
  analysis: null,
  droppedQuotes: [],
  motifs: [],
  dossierLanguage: null,
  analysisUpdatedAt: null,
  createdAt: '2026-10-26T00:00:00.000Z',
  updatedAt: '2026-10-26T00:00:00.000Z',
  ...patch,
});

const view = () => (
  <ContentDraftBlock versionId="v1" lang="en">
    {(d) => <div data-testid="result">{d.status}</div>}
  </ContentDraftBlock>
);

const button = () => screen.getByRole('button', { name: 'Draft from dossier' });

const estimate = (refusedTooLong: boolean): ContentDraftEstimate => ({
  kind: 'analysis',
  dossier: { estimateUsd: '0.5', suggestedLimitUsd: '0.75', upperBound: false, refusedTooLong },
  glossary: null,
  stageUsd: '0.2',
  upperBound: true,
  suggestedLimitUsd: '0.75',
});

const stale = () =>
  new ApiError({ statusCode: 409, message: 'stale', data: { code: 'DOSSIER_STALE' } });

describe('ContentDraftBlock (analysis)', () => {
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
      rebuildDossier: mutation(),
    };
  });

  it('start: the estimate is asked only when the confirmation opens and shows the dossier line', () => {
    hooks.estimate = estimate(false);
    render(view());
    expect(hooks.estimateEnabled.every((e) => !e)).toBe(true);
    fireEvent.click(button());
    expect(screen.getByText(/The dossier is built first: up to \$0\.5/)).toBeInTheDocument();
    expect(screen.queryByText(/glossary/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    expect(hooks.actions.start.mutate).toHaveBeenCalledTimes(1);
    expect(hooks.actions.start.mutate).toHaveBeenCalledWith({});
  });

  it('start: a dossier the start will refuse DOSSIER_TOO_LONG — the text says so and «Start» is disabled (T151)', () => {
    hooks.estimate = estimate(true);
    render(view());
    fireEvent.click(button());
    expect(screen.getByText(/will not be built/)).toBeInTheDocument();
    expect(screen.queryByText(/The dossier is built first/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start' })).toBeDisabled();
  });

  it('building: waits for the dossier, then for the glossary; the button is disabled, no result', () => {
    hooks.draft = draft({ waitingFor: 'dossier' });
    const { rerender } = render(view());
    expect(screen.getByRole('status')).toHaveTextContent('Building the dossier first');
    expect(button()).toBeDisabled();
    expect(screen.queryByTestId('result')).toBeNull();
    hooks.draft = draft({ waitingFor: 'glossary' });
    rerender(view());
    expect(screen.getByRole('status')).toHaveTextContent(
      'Building the glossary of this language first'
    );
    hooks.draft = draft();
    rerender(view());
    expect(screen.getByRole('status')).toHaveTextContent('Building the draft…');
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

  it('failed — the reason in words, no result; ready — the result and discard after confirmation', () => {
    hooks.draft = draft({ status: 'failed', failedReason: 'DRAFT_INVALID_RESPONSE' });
    const { unmount } = render(view());
    expect(screen.getByRole('alert')).toHaveTextContent(
      'the model answered not in the expected form'
    );
    expect(screen.queryByTestId('result')).toBeNull();
    unmount();
    hooks.draft = draft({ status: 'ready' });
    render(view());
    expect(screen.getByTestId('result')).toHaveTextContent('ready');
    fireEvent.click(screen.getByRole('button', { name: 'Discard draft' }));
    expect(hooks.actions.discard.mutate).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Discard' }));
    expect(hooks.actions.discard.mutate).toHaveBeenCalledTimes(1);
    expect(hooks.actions.discard.mutate).toHaveBeenCalledWith('d1');
  });

  it('DOSSIER_STALE on start — the refusal and «Rebuild dossier» with its estimate', () => {
    hooks.actions.start.error = stale();
    render(view());
    expect(screen.getByRole('alert')).toHaveTextContent('rebuild the dossier');
    fireEvent.click(screen.getByRole('button', { name: 'Rebuild dossier' }));
    expect(screen.getByText(/from 3 chapters: up to \$0\.5/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Rebuild' }));
    expect(hooks.actions.rebuildDossier.mutate).toHaveBeenCalledTimes(1);
  });

  it('a dossier the start will refuse DOSSIER_TOO_LONG: «Rebuild» says it will not be built and is disabled (T147)', () => {
    hooks.dossierRefused = true;
    hooks.actions.start.error = stale();
    render(view());
    fireEvent.click(screen.getByRole('button', { name: 'Rebuild dossier' }));
    expect(screen.getByText(/The dossier will not be built/)).toBeInTheDocument();
    expect(screen.queryByText(/up to \$0\.5/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Rebuild' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Rebuild' }));
    expect(hooks.actions.rebuildDossier.mutate).not.toHaveBeenCalled();
  });

  it('the estimate did not come — Start is disabled; the stale dossier keeps «Rebuild dossier» after Cancel', () => {
    hooks.estimateError = stale();
    render(view());
    fireEvent.click(button());
    expect(screen.getByRole('button', { name: 'Start' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByRole('button', { name: 'Rebuild dossier' })).toBeInTheDocument();
    expect(hooks.actions.start.mutate).not.toHaveBeenCalled();
  });

  it('discard of a building draft - cancel keeps it', () => {
    hooks.draft = draft();
    render(view());
    fireEvent.click(screen.getByRole('button', { name: 'Discard draft' }));
    expect(screen.getByText(/Stop building this draft/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(hooks.actions.discard.mutate).not.toHaveBeenCalled();
  });
});
