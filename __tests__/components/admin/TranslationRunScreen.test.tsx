import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TranslationRunScreen } from '@/components/admin/translation-run/TranslationRunScreen';

/**
 * Экран перевода версии: сводки сверху, подробный ход и история — свёрнуты в «Details» внизу,
 * запусков нет — так и сказано.
 */

const VERSION = { bookId: 'b1', title: 'Heart of Darkness', language: 'en' };

const state = vi.hoisted(() => ({
  runs: [] as Array<{ id: string }>,
  runsError: null as unknown,
  runsLoading: false,
  runsRefetch: vi.fn(),
  version: {
    data: undefined as unknown,
    isError: false,
    error: null as unknown,
    refetch: vi.fn(),
  },
}));

vi.mock('@/api/hooks', () => ({
  useBookVersion: () => state.version,
  useVersionTranslationRuns: () => ({
    runs: state.runs,
    error: state.runsError,
    isLoading: state.runsLoading,
    refetch: state.runsRefetch,
  }),
}));

vi.mock('@/components/admin/translation-run/RunOverview', () => ({
  RunOverview: ({ runId }: { runId: string }) => <section aria-label={`Overview ${runId}`} />,
}));
vi.mock('@/components/admin/translation-run/TranslationRunBlock', () => ({
  TranslationRunBlock: () => <section aria-label="Translation run" />,
}));
vi.mock('@/components/admin/translation-run/RunHistory', () => ({
  RunHistory: () => <section aria-label="Translation history" />,
}));
vi.mock('@/components/admin/translation-run/TranslateButton', () => ({
  TranslateButton: () => <button type="button">Translate to other languages</button>,
}));

describe('TranslationRunScreen', () => {
  beforeEach(() => {
    state.runs = [{ id: 'r1' }];
    state.runsError = null;
    state.runsLoading = false;
    state.runsRefetch = vi.fn();
    state.version = { data: VERSION, isError: false, error: null, refetch: vi.fn() };
  });

  it('сводка запуска сверху, подробности — в свёрнутом «Details», путь назад к версии', async () => {
    const { container } = render(<TranslationRunScreen versionId="v1" lang="en" />);

    expect(screen.getByRole('heading', { name: 'Translation' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Overview r1' })).toBeInTheDocument();
    const details = container.querySelector('details');
    expect(details).not.toBeNull();
    expect(details).not.toHaveAttribute('open');
    // Свёрнутые детали не монтируют ход и историю: ни опроса, ни чанков.
    expect(screen.queryByRole('region', { name: 'Translation run', hidden: true })).toBeNull();
    // Раскрыли — ход и история внутри деталей.
    act(() => {
      details!.open = true;
      details!.dispatchEvent(new Event('toggle'));
    });
    // Своими чанками (next/dynamic): появляются после загрузки.
    expect(details).toContainElement(
      await screen.findByRole('region', { name: 'Translation run' })
    );
    expect(details).toContainElement(
      await screen.findByRole('region', { name: 'Translation history' })
    );
    expect(screen.getByRole('link', { name: /Back to the version/ })).toHaveAttribute(
      'href',
      '/admin/en/books/versions/v1'
    );
    expect(
      screen.getByRole('button', { name: 'Translate to other languages' })
    ).toBeInTheDocument();
  });

  it('запусков нет — так и сказано', () => {
    state.runs = [];
    render(<TranslationRunScreen versionId="v1" lang="en" />);

    expect(screen.getByText('This version has not been translated yet.')).toBeInTheDocument();
  });

  it('списки запусков ещё читаются — не «не переводилась»', () => {
    state.runs = [];
    state.runsLoading = true;
    render(<TranslationRunScreen versionId="v1" lang="en" />);

    expect(screen.queryByText('This version has not been translated yet.')).not.toBeInTheDocument();
    // На месте сводки — спиннер, а не пустота.
    expect(screen.getByTestId('runs-loading')).toBeInTheDocument();
  });

  it('отказ списка запусков — плашка с «Retry», а не ложное «не переводилась»', () => {
    state.runs = [];
    state.runsError = new Error('x');
    render(<TranslationRunScreen versionId="v1" lang="en" />);

    screen.getByRole('button', { name: 'Retry' }).click();
    expect(state.runsRefetch).toHaveBeenCalled();
    expect(screen.queryByText('This version has not been translated yet.')).not.toBeInTheDocument();
  });

  it('отказ чтения версии — плашка с «Retry» вместо экрана', () => {
    state.version = { data: undefined, isError: true, error: new Error('x'), refetch: vi.fn() };
    render(<TranslationRunScreen versionId="v1" lang="en" />);

    screen.getByRole('button', { name: 'Retry' }).click();
    expect(state.version.refetch).toHaveBeenCalled();
    expect(screen.queryByRole('heading', { name: 'Translation' })).not.toBeInTheDocument();
    // Путь назад есть и при отказе.
    expect(screen.getByRole('link', { name: /Back to the version/ })).toHaveAttribute(
      'href',
      '/admin/en/books/versions/v1'
    );
  });
});
