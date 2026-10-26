import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AnalysisDraft } from '@/components/admin/books/AnalysisTab/AnalysisDraft';
import type { ContentDraft, LlmOperation } from '@/types/api-schema';

/**
 * F05-11: заготовка Analysis из досье — готовый JSON открывается в окне импорта F03, только когда
 * форма в блоках заготовки сохранена (Р4) и анализ не сохраняли после сборки (Р15); выкинутые
 * цитаты видны с причиной (Р9), мотивы досье — подписью (Р10). Хуки подменены.
 */

const hooks = vi.hoisted(() => ({ draft: null as unknown }));

const mutation = () => ({
  mutate: vi.fn(),
  mutateAsync: vi.fn(),
  reset: vi.fn(),
  isPending: false,
  isSuccess: false,
  error: null,
});

vi.mock('@/api/hooks', () => ({
  useContentDraft: () => ({ data: { draft: hooks.draft }, isError: false, refetch: vi.fn() }),
  useContentDraftActions: () => ({
    start: mutation(),
    discard: mutation(),
    resume: mutation(),
    markAdded: mutation(),
    rebuildDossier: mutation(),
  }),
  useContentDraftEstimate: () => ({ data: undefined, isError: false, isFetching: false }),
  useDossierEstimate: () => ({ data: undefined, isError: false, isFetching: false }),
}));

const operation: LlmOperation = {
  id: 'op-1',
  kind: 'draft',
  status: 'done',
  pauseReason: null,
  bookVersionId: 'v1',
  limitUsd: '1',
  reservedUsd: '0',
  spentUsd: '0.1',
  createdAt: '2026-10-26T00:00:00.000Z',
  updatedAt: '2026-10-26T00:00:00.000Z',
};

const SAVED_AT = '2026-10-26T10:00:00.000Z';

const draft = (patch: Partial<ContentDraft> = {}): ContentDraft => ({
  id: 'd1',
  bookVersionId: 'v1',
  kind: 'analysis',
  status: 'ready',
  language: 'fr',
  failedReason: null,
  waitingFor: null,
  operation,
  model: 'm',
  plannedSections: null,
  sections: null,
  addedSections: [],
  text: null,
  question: null,
  analysis: { language: 'fr', keyQuotes: [{ text: 'Ligne', chapter: 2 }] },
  droppedQuotes: [
    { path: 'keyQuotes', text: 'Inventée', chapter: 2, reason: 'NOT_FOUND' },
    { path: 'style.0.example', text: 'Sans chapitre', chapter: null, reason: 'NO_CHAPTER' },
  ],
  motifs: [{ image: 'the door', chapters: [2] }],
  dossierLanguage: 'en',
  analysisUpdatedAt: SAVED_AT,
  createdAt: '2026-10-26T00:00:00.000Z',
  updatedAt: '2026-10-26T00:00:00.000Z',
  ...patch,
});

const view = (
  unsaved = false,
  savedUpdatedAt: string | null = SAVED_AT,
  serverUpdatedAt: string | null = savedUpdatedAt
) => {
  const onOpen = vi.fn();
  render(
    <AnalysisDraft
      versionId="v1"
      lang="en"
      versionLanguage="fr"
      unsaved={unsaved}
      savedUpdatedAt={savedUpdatedAt}
      serverUpdatedAt={serverUpdatedAt}
      onOpen={onOpen}
    />
  );
  return { onOpen, open: () => screen.getByRole('button', { name: 'Open in import' }) };
};

describe('AnalysisDraft (F05-11)', () => {
  beforeEach(() => {
    hooks.draft = draft();
  });

  it('ready: «Open in import» opens the import window with the draft JSON', () => {
    const { onOpen, open } = view();
    expect(open()).toBeEnabled();
    fireEvent.click(open());
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onOpen).toHaveBeenCalledWith(JSON.stringify(draft().analysis, null, 2));
  });

  it('thrown away quotes are listed with chapter and reason; motifs in the dossier language', () => {
    view();
    expect(
      screen.getByText(/«Inventée» \(chapter 2\) — not word for word in the chapter/)
    ).toBeInTheDocument();
    expect(screen.getByText(/«Sans chapitre» — no chapter given/)).toBeInTheDocument();
    expect(
      screen.getByText(/1 recurring motif of the dossier is .* \(in the dossier language: en\)\./)
    ).toBeInTheDocument();
  });

  it('unsaved edits of the draft blocks close the import with a hint (Р4)', () => {
    const { onOpen, open } = view(true);
    expect(open()).toBeDisabled();
    expect(screen.getByText(/Save or undo the edits/)).toBeInTheDocument();
    fireEvent.click(open());
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('the analysis saved after the draft was built — the import is closed, rebuild (Р15)', () => {
    const { open } = view(false, '2026-10-26T11:00:00.000Z');
    expect(open()).toBeDisabled();
    expect(screen.getByText(/saved after this draft was built/)).toBeInTheDocument();
  });

  it('each thrown away quote names its place; a chapter the version has not is said so', () => {
    hooks.draft = draft({
      droppedQuotes: [
        { path: 'keyQuotes', text: 'K', chapter: 9, reason: 'CHAPTER_MISSING' },
        { path: 'characters.anna.quote', text: 'L', chapter: 1, reason: 'NOT_FOUND' },
        { path: 'style.0.example', text: 'E', chapter: null, reason: 'NO_CHAPTER' },
      ],
    });
    view();
    expect(
      screen.getByText(/key quote: «K» \(chapter 9\) — the version has no such chapter/)
    ).toBeInTheDocument();
    expect(screen.getByText(/line of anna: «L»/)).toBeInTheDocument();
    expect(
      screen.getByText(/example of style device 1: «E» — no chapter given/)
    ).toBeInTheDocument();
  });

  it('places are named by the hero name and the device title; a verified quote over the limit is said so (Р19)', () => {
    hooks.draft = draft({
      analysis: {
        language: 'fr',
        characters: [{ key: 'anna', name: 'Anna Karénine', role: 'main' }],
        style: [{ device: 'Ironie', explanation: 'x' }],
      },
      droppedQuotes: [
        { path: 'characters.anna.quote', text: 'L', chapter: 1, reason: 'NOT_FOUND' },
        { path: 'style.0.example', text: 'E', chapter: 2, reason: 'NOT_FOUND' },
        { path: 'keyQuotes', text: 'Q', chapter: 3, reason: 'OVER_LIMIT' },
      ],
    });
    view();
    expect(screen.getByText(/line of Anna Karénine: «L»/)).toBeInTheDocument();
    expect(screen.getByText(/example of «Ironie»: «E»/)).toBeInTheDocument();
    expect(
      screen.getByText(/key quote: «Q» \(chapter 3\) — verified, but over the limit of 12/)
    ).toBeInTheDocument();
  });

  it('a ready draft without the JSON — the import is closed with a hint', () => {
    hooks.draft = draft({ analysis: null });
    const { open } = view();
    expect(open()).toBeDisabled();
    expect(screen.getByText(/has no analysis JSON/)).toBeInTheDocument();
  });

  it('failed: the reason is shown, no result', () => {
    hooks.draft = draft({ status: 'failed', failedReason: 'DRAFT_INVALID_RESPONSE' });
    view();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Failed: the model answered not in the expected form.'
    );
    expect(screen.queryByRole('button', { name: 'Open in import' })).toBeNull();
  });

  it('discard of a ready analysis draft speaks of the JSON, not of sections', () => {
    view();
    fireEvent.click(screen.getByRole('button', { name: 'Discard draft' }));
    expect(screen.getByText(/The draft JSON not imported into the form/)).toBeInTheDocument();
    expect(screen.queryByText(/Sections not added/)).toBeNull();
  });

  it('built over a record someone else saved after the tab opened — reload, not rebuild', () => {
    const later = '2026-10-26T11:00:00.000Z';
    hooks.draft = draft({ analysisUpdatedAt: later });
    const { open } = view(false, SAVED_AT, later);
    expect(open()).toBeDisabled();
    expect(screen.getByText(/saved by someone else .* reload the page/)).toBeInTheDocument();
    expect(screen.queryByText(/build a new draft/)).toBeNull();
  });

  it('the draft is newer than the form while the cached server record is old — reload, not rebuild', () => {
    hooks.draft = draft({ analysisUpdatedAt: '2026-10-26T13:00:00.000Z' });
    const { open } = view(false, SAVED_AT, SAVED_AT);
    expect(open()).toBeDisabled();
    expect(screen.getByText(/saved by someone else .* reload the page/)).toBeInTheDocument();
  });

  it('the draft older than an own later save — no nudge to pay again', () => {
    hooks.draft = draft({ analysisUpdatedAt: '2026-10-26T09:00:00.000Z' });
    const { open } = view(false, SAVED_AT, SAVED_AT);
    expect(open()).toBeDisabled();
    expect(
      screen.getByText(/may be already imported\): build a new draft only if you need one/)
    ).toBeInTheDocument();
  });

  it('draft and form on record A, the server already on B — reload, the import is closed', () => {
    const { open } = view(false, SAVED_AT, '2026-10-26T12:00:00.000Z');
    expect(open()).toBeDisabled();
    expect(screen.getByText(/saved by someone else .* reload the page/)).toBeInTheDocument();
  });

  it('no analysis on either side — the import is open', () => {
    hooks.draft = draft({ analysisUpdatedAt: null });
    const { open } = view(false, null, null);
    expect(open()).toBeEnabled();
  });

  it('building: no result yet, the button of the block is busy', () => {
    hooks.draft = draft({ status: 'building', operation: { ...operation, status: 'active' } });
    view();
    expect(screen.queryByRole('button', { name: 'Open in import' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Draft from dossier' })).toBeDisabled();
  });
});
