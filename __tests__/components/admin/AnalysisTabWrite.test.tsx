import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AnalysisTab } from '@/components/admin/books/AnalysisTab';

/**
 * F07-3a на вкладке Analysis: проводка хода «Write Analysis» — блок только у `admin` (вместо
 * снятой заготовки «Draft from dossier»), запись хода перечитывает форму вкладки (`reloadBlocks`);
 * «Import JSON» открывает пустое окно. Хук вкладки, блок хода и окно подменены заглушками.
 */

const reloadBlocks = vi.fn();
const tabState = vi.hoisted(() => ({
  savedHasCore: null as boolean | null,
  formStale: false,
  saveBlockedReason: null as string | null,
  serverBlocks: {} as Record<string, string>,
}));

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
    savedHasCore: tabState.savedHasCore,
    serverBlocks: tabState.serverBlocks,
    formStale: tabState.formStale,
    saveBlockedReason: tabState.saveBlockedReason,
    reloadBlocks,
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
  ImportAnalysisModal: (props: { isOpen: boolean; onCancel: () => void }) =>
    props.isOpen ? (
      <div data-testid="import">
        <button type="button" onClick={props.onCancel}>
          close import
        </button>
      </div>
    ) : null,
}));

// Блок хода — заглушка с одной кнопкой: сообщает о записанных блоках (`onBlocksWritten`).
vi.mock('next/dynamic', () => ({
  default: () => {
    const Stub = (props: { onBlocksWritten: () => void }) => (
      <button type="button" onClick={props.onBlocksWritten}>
        Run wrote blocks
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

describe('AnalysisTab: the analysis run (F07-3a)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tabState.savedHasCore = null;
    tabState.formStale = false;
    tabState.saveBlockedReason = null;
    tabState.serverBlocks = {};
  });

  it('server text is shown next to the fact, text and list it belongs to; Save stays open', () => {
    tabState.serverBlocks = {
      'facts.genre': 'Their genre',
      mainIdea: 'Their idea',
      themes: '[{"their":"theme"}]',
    };
    render(<AnalysisTab versionId="v1" version={version} isAdmin={false} lang="en" />);
    const near = (label: string, text: string) =>
      expect(screen.getByLabelText(label).closest('div')).toHaveTextContent(text);
    near('genre', 'Their genre');
    near('mainIdea', 'Their idea');
    near('themes', '[{"their":"theme"}]');
    expect(screen.getByRole('button', { name: 'Save analysis' })).toBeEnabled();
  });

  it('not admin — no run block, no «Draft from dossier»', () => {
    render(<AnalysisTab versionId="v1" version={version} isAdmin={false} lang="en" />);
    expect(screen.queryByRole('button', { name: 'Run wrote blocks' })).toBeNull();
    expect(screen.queryByText('Draft from dossier')).toBeNull();
  });

  it('admin — the run block is there; its writes reload the form of the tab', () => {
    render(<AnalysisTab versionId="v1" version={version} isAdmin lang="en" />);
    fireEvent.click(screen.getByRole('button', { name: 'Run wrote blocks' }));
    expect(reloadBlocks).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Draft from dossier')).toBeNull();
  });

  it('the core is one text: admin — in the run block only, others — the line of the tab', () => {
    tabState.savedHasCore = true;
    const { unmount } = render(
      <AnalysisTab versionId="v1" version={version} isAdmin={false} lang="en" />
    );
    expect(screen.getByText('Saved analysis has a complete core.')).toBeInTheDocument();
    unmount();
    render(<AnalysisTab versionId="v1" version={version} isAdmin lang="en" />);
    expect(screen.queryByText('Saved analysis has a complete core.')).toBeNull();
  });

  it('the analysis changed on the server and was not reloaded — Save is stopped, Reload reads it again', () => {
    tabState.formStale = true;
    render(<AnalysisTab versionId="v1" version={version} isAdmin lang="en" />);
    expect(screen.getByRole('button', { name: 'Save analysis' })).toBeDisabled();
    expect(screen.getByText(/could not be reloaded/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reload' }));
    expect(reloadBlocks).toHaveBeenCalledTimes(1);
  });

  it('Save is closed with the reason while the run writes blocks', () => {
    tabState.saveBlockedReason = 'The analysis run is writing blocks: save when it ends or pauses.';
    render(<AnalysisTab versionId="v1" version={version} isAdmin lang="en" />);
    expect(screen.getByRole('button', { name: 'Save analysis' })).toBeDisabled();
    expect(
      screen.getByText('The analysis run is writing blocks: save when it ends or pauses.')
    ).toBeInTheDocument();
  });

  it('«Import JSON» opens the import; closing hides it', () => {
    render(<AnalysisTab versionId="v1" version={version} isAdmin lang="en" />);
    fireEvent.click(screen.getByRole('button', { name: 'Import JSON' }));
    expect(screen.getByTestId('import')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'close import' }));
    expect(screen.queryByTestId('import')).toBeNull();
  });
});
