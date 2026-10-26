import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AnalysisTab } from '@/components/admin/books/AnalysisTab';

/**
 * F05-11 на вкладке Analysis: проводка заготовки — блок только у `admin`, «Open in import»
 * открывает окно импорта с JSON заготовки, закрытие сбрасывает его, ручной «Import JSON» —
 * пустой. Хук вкладки, блок заготовки и окно подменены заглушками.
 */

const DRAFT_JSON = '{"language":"en","keyQuotes":[{"text":"Line","chapter":1}]}';

vi.mock('@/components/admin/books/AnalysisTab/useAnalysisTab', () => ({
  useAnalysisTab: () => ({
    form: {
      facts: {},
      texts: { mainIdea: '', titleMeaning: '', endingMeaning: '', context: '', reception: '' },
      lists: {},
      drafts: Object.fromEntries(
        [
          'themes',
          'characters',
          'symbols',
          'keyQuotes',
          'timeline',
          'style',
          'adaptations',
          'misreadings',
          'discussionQuestions',
          'faq',
          'sources',
        ].map((k) => [k, { text: '', issues: null }])
      ),
    },
    isLoading: false,
    loadError: null,
    validationFailed: false,
    lastCheck: null,
    savedCheckError: null,
    savedHasCore: null,
    draftBlocksUnsaved: false,
    savedUpdatedAt: null,
    serverUpdatedAt: null,
    analyzeImport: null,
    setFact: vi.fn(),
    setText: vi.fn(),
    setListText: vi.fn(),
    handleSave: vi.fn(),
    copyPromptInputs: vi.fn(),
    previewImport: vi.fn(),
    applyImport: vi.fn(),
    retryValidation: vi.fn(),
    retrySavedCheck: vi.fn(),
    retryLoad: vi.fn(),
    isSaving: false,
  }),
}));

vi.mock('@/components/admin/books/AnalysisTab/ImportAnalysisModal', () => ({
  ImportAnalysisModal: (props: { isOpen: boolean; initialJson?: string; onCancel: () => void }) =>
    props.isOpen ? (
      <div data-testid="import" data-json={props.initialJson ?? ''}>
        <button type="button" onClick={props.onCancel}>
          close import
        </button>
      </div>
    ) : null,
}));

// Блок заготовки — заглушка с одной кнопкой: отдаёт JSON заготовки в `onOpen`.
vi.mock('next/dynamic', () => ({
  default: () => {
    const Stub = (props: { onOpen: (json: string) => void }) => (
      <button type="button" onClick={() => props.onOpen(DRAFT_JSON)}>
        Open in import
      </button>
    );
    return Stub;
  },
}));

const version = {
  title: 'T',
  author: 'A',
  language: 'en' as const,
  firstPublishedYear: null,
  characters: null,
  quotes: null,
};

describe('AnalysisTab: draft from the dossier (F05-11)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('not admin — no draft block', () => {
    render(<AnalysisTab versionId="v1" version={version} isAdmin={false} lang="en" />);
    expect(screen.queryByRole('button', { name: 'Open in import' })).toBeNull();
  });

  it('admin — «Open in import» opens the import with the draft JSON; closing resets it', () => {
    render(<AnalysisTab versionId="v1" version={version} isAdmin lang="en" />);
    fireEvent.click(screen.getByRole('button', { name: 'Open in import' }));
    expect(screen.getByTestId('import')).toHaveAttribute('data-json', DRAFT_JSON);
    fireEvent.click(screen.getByRole('button', { name: 'close import' }));
    expect(screen.queryByTestId('import')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Import JSON' }));
    expect(screen.getByTestId('import')).toHaveAttribute('data-json', '');
  });
});
