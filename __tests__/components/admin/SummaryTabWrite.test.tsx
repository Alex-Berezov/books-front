import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SummaryTab } from '@/components/admin/books/SummaryTab';

/**
 * F06-3 на вкладке Summary: ход «Write Summary» — только у `admin` (остальным ролям его нет);
 * пошаговых заготовок F05-10 больше нет; запись хода в полный и «Очень кратко» перечитывает
 * поля формы из свежего ответа сервера. Ход подменён заглушкой.
 */

const mocks = vi.hoisted(() => ({
  summary: { summary: '<p>Saved.</p>', hasText: true, brief: '<p>Brief.</p>' },
  onFieldsWritten: null as null | ((fields: Array<'full' | 'brief'>) => void),
}));

vi.mock('notistack', () => ({ useSnackbar: () => ({ enqueueSnackbar: vi.fn() }) }));
vi.mock('@/api/hooks', () => ({
  useBookSummary: () => ({
    data: mocks.summary,
    isError: false,
    status: 'success',
    fetchStatus: 'idle',
    refetch: () =>
      Promise.resolve({ status: 'success', data: mocks.summary, dataUpdatedAt: Date.now() }),
  }),
  useUpsertBookSummary: () => ({ mutate: vi.fn(), isPending: false }),
  useUpsertBookSummaryBrief: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock('@/components/admin/books/SummaryTab/SummarySections', () => ({
  SummarySections: (props: { versionId: string }) => (
    <div data-testid="sections" data-version={props.versionId} />
  ),
}));
vi.mock('@/components/admin/common/AdminRichTextEditor', () => ({
  AdminRichTextEditor: (props: { id: string; value: string; onChange: (html: string) => void }) => (
    <textarea
      data-testid={props.id}
      data-value={props.value}
      value={props.value}
      onChange={(e) => props.onChange(e.target.value)}
    />
  ),
}));
vi.mock('next/dynamic', () => ({
  default: () => {
    const Stub = (props: {
      versionId: string;
      onFieldsWritten: (fields: Array<'full' | 'brief'>) => void;
    }) => {
      mocks.onFieldsWritten = props.onFieldsWritten;
      return <div data-testid="summary-write" data-version={props.versionId} />;
    };
    return Stub;
  },
}));

describe('SummaryTab: the summary run', () => {
  beforeEach(() => {
    mocks.summary = { summary: '<p>Saved.</p>', hasText: true, brief: '<p>Brief.</p>' };
    mocks.onFieldsWritten = null;
  });

  it('content_manager — no «Write Summary» block; the sections list is in place', () => {
    render(<SummaryTab versionId="v1" isAdmin={false} />);
    expect(screen.queryByTestId('summary-write')).toBeNull();
    expect(screen.getByTestId('sections')).toHaveAttribute('data-version', 'v1');
  });

  it('admin — no step-by-step draft buttons of F05-10 any more', () => {
    render(<SummaryTab versionId="v1" isAdmin lang="en" />);
    for (const name of [
      'Draft sections from dossier',
      'Draft full summary from saved sections',
      'Draft very short summary from saved full summary',
    ]) {
      expect(screen.queryByRole('button', { name })).toBeNull();
    }
    expect(screen.queryByRole('button', { name: /Put the draft/ })).toBeNull();
    expect(screen.getByTestId('sections')).toBeInTheDocument();
  });

  it('admin — the block of this version', () => {
    render(<SummaryTab versionId="v1" isAdmin lang="en" />);
    expect(screen.getByTestId('summary-write')).toHaveAttribute('data-version', 'v1');
  });

  it('the run wrote the full summary — the form takes only that field from the server', async () => {
    render(<SummaryTab versionId="v1" isAdmin lang="en" />);
    expect(screen.getByTestId('summaryText')).toHaveAttribute('data-value', '<p>Saved.</p>');
    mocks.summary = { summary: '<p>Accepted.</p>', hasText: true, brief: '<p>New brief.</p>' };
    act(() => mocks.onFieldsWritten?.(['full']));
    await waitFor(() =>
      expect(screen.getByTestId('summaryText')).toHaveAttribute('data-value', '<p>Accepted.</p>')
    );
    expect(screen.getByTestId('briefText')).toHaveAttribute('data-value', '<p>Brief.</p>');
  });

  it('an unsaved Summary edit: its notice under Summary, the very short summary goes in silently; Load puts the server text into Summary', async () => {
    render(<SummaryTab versionId="v1" isAdmin lang="en" />);
    fireEvent.change(screen.getByTestId('summaryText'), { target: { value: '<p>Mine.</p>' } });
    mocks.summary = { summary: '<p>Run full.</p>', hasText: true, brief: '<p>Run brief.</p>' };
    act(() => mocks.onFieldsWritten?.(['full', 'brief']));
    await waitFor(() =>
      expect(screen.getByTestId('briefText')).toHaveAttribute('data-value', '<p>Run brief.</p>')
    );
    expect(screen.getByText(/“Summary” was changed on the server/)).toBeInTheDocument();
    expect(screen.queryByText(/“Very short summary” was changed/)).toBeNull();
    expect(screen.getByTestId('summaryText')).toHaveAttribute('data-value', '<p>Mine.</p>');
    fireEvent.click(screen.getByRole('button', { name: 'Load the server text' }));
    expect(screen.getByTestId('summaryText')).toHaveAttribute('data-value', '<p>Run full.</p>');
    expect(screen.getByTestId('briefText')).toHaveAttribute('data-value', '<p>Run brief.</p>');
    expect(screen.queryByText(/was changed on the server/)).toBeNull();
  });

  it('an unsaved very short edit: the notice under it, Load puts the text only there', async () => {
    render(<SummaryTab versionId="v1" isAdmin lang="en" />);
    fireEvent.change(screen.getByTestId('briefText'), { target: { value: '<p>Mine.</p>' } });
    mocks.summary = { summary: '<p>Saved.</p>', hasText: true, brief: '<p>Run brief.</p>' };
    act(() => mocks.onFieldsWritten?.(['brief']));
    expect(await screen.findByText(/“Very short summary” was changed/)).toBeInTheDocument();
    expect(screen.queryByText(/“Summary” was changed/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Load the server text' }));
    expect(screen.getByTestId('briefText')).toHaveAttribute('data-value', '<p>Run brief.</p>');
    expect(screen.getByTestId('summaryText')).toHaveAttribute('data-value', '<p>Saved.</p>');
  });
});
