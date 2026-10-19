import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SummaryTab } from '@/components/admin/books/SummaryTab';

/**
 * Вкладка Summary при отказе загрузки пересказа (F04-1, решение арбитра `F04 | F04-1`): вместо
 * полей — ошибка загрузки. Открытые пустые поля дали бы стереть очень краткий пересказ, которого
 * редактор не видел, а поздний ответ затёр бы набранное.
 */

const mocks = vi.hoisted(() => ({ isError: false, existing: null as unknown }));

vi.mock('notistack', () => ({ useSnackbar: () => ({ enqueueSnackbar: vi.fn() }) }));
vi.mock('@/api/hooks', () => ({
  useBookSummary: () => ({ data: mocks.existing, isLoading: false, isError: mocks.isError }),
  useUpsertBookSummary: () => ({ mutate: vi.fn(), isPending: false }),
  useUpsertBookSummaryBrief: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock('@/components/admin/books/SummaryTab/SummarySections', () => ({
  SummarySections: () => <div data-testid="sections" />,
}));
vi.mock('@/components/admin/common/AdminRichTextEditor', () => ({
  AdminRichTextEditor: (props: { id: string; ariaLabel?: string }) => (
    <textarea data-testid={props.id} aria-label={props.ariaLabel} />
  ),
}));

describe('SummaryTab: отказ загрузки пересказа', () => {
  beforeEach(() => {
    mocks.isError = false;
    mocks.existing = null;
  });

  it('отказ — ошибка вместо полей, кнопок сохранения нет; разделы остаются', () => {
    mocks.isError = true;
    mocks.existing = undefined;
    render(<SummaryTab versionId="v1" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Failed to load the summary');
    expect(screen.queryByTestId('summaryText')).not.toBeInTheDocument();
    expect(screen.queryByTestId('briefText')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Save/ })).not.toBeInTheDocument();
    expect(screen.getByTestId('sections')).toBeInTheDocument();
  });

  it('удачная загрузка — поля и выключенная без полного пересказа кнопка очень краткого', () => {
    render(<SummaryTab versionId="v1" />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByTestId('summaryText')).toBeInTheDocument();
    expect(screen.getByTestId('briefText')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save Very Short Summary' })).toBeDisabled();
  });
});
