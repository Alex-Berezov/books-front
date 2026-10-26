import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SummaryTab } from '@/components/admin/books/SummaryTab';

/**
 * F05-10 на вкладке Summary: заготовки из досье — только у `admin` (решение арбитра
 * `F05 | F05-10`, В8); шаги идут по одному: полный ждёт сохранённых разделов, очень краткий —
 * сохранённого полного. Сама заготовка подменена заглушкой с видом и подсказкой.
 */

const mocks = vi.hoisted(() => ({
  sections: [] as Array<{ id: string }>,
  hasText: false,
  sectionsState: 'success' as 'success' | 'pending' | 'error',
}));

vi.mock('notistack', () => ({ useSnackbar: () => ({ enqueueSnackbar: vi.fn() }) }));
vi.mock('@/api/hooks', () => ({
  useBookSummary: () => ({
    data: mocks.hasText ? { summary: '<p>Saved.</p>', hasText: true, brief: null } : null,
    isError: false,
    status: 'success',
    fetchStatus: 'idle',
  }),
  useUpsertBookSummary: () => ({ mutate: vi.fn(), isPending: false }),
  useUpsertBookSummaryBrief: () => ({ mutate: vi.fn(), isPending: false }),
  useBookSummarySections: () => ({
    data: mocks.sectionsState === 'success' ? { sections: mocks.sections } : undefined,
    isPending: mocks.sectionsState === 'pending',
    isError: mocks.sectionsState === 'error',
  }),
}));
vi.mock('@/components/admin/books/SummaryTab/SummarySections', () => ({
  SummarySections: (props: { isAdmin?: boolean }) => (
    <div data-testid="sections" data-admin={String(props.isAdmin)} />
  ),
}));
vi.mock('@/components/admin/common/AdminRichTextEditor', () => ({
  AdminRichTextEditor: (props: { id: string }) => <textarea data-testid={props.id} />,
}));
// Заготовка — заглушка: отдаёт готовый текст своего вида в `children`; подстановка — кнопка
// с тем, что сейчас в поле. Так видна проводка «заготовка → поле формы» самой вкладки.
vi.mock('next/dynamic', () => ({
  default: () => {
    const Stub = (props: {
      kind?: string;
      blockedHint?: string | null;
      children?: (d: unknown, t: unknown) => unknown;
      field?: string;
      current?: string;
      text?: string;
      onUse?: (text: string) => void;
    }) => {
      if (props.kind) {
        return (
          <div data-testid={`draft-${props.kind}`} data-blocked={String(props.blockedHint)}>
            {props.children?.({ status: 'ready', text: `<p>${props.kind}</p>` }, {}) as never}
          </div>
        );
      }
      return (
        <button
          type="button"
          data-current={props.current}
          onClick={() => props.onUse?.(props.text ?? '')}
        >
          {`use ${props.field}`}
        </button>
      );
    };
    return Stub;
  },
}));

describe('SummaryTab: drafts from the dossier', () => {
  beforeEach(() => {
    mocks.sections = [];
    mocks.hasText = false;
    mocks.sectionsState = 'success';
  });

  it('content_manager — no draft blocks at all', () => {
    render(<SummaryTab versionId="v1" isAdmin={false} />);
    expect(screen.queryByTestId('draft-summary_full')).not.toBeInTheDocument();
    expect(screen.queryByTestId('draft-summary_brief')).not.toBeInTheDocument();
    expect(screen.getByTestId('sections')).toHaveAttribute('data-admin', 'false');
  });

  it('admin, nothing saved — the full and very short steps are blocked', () => {
    render(<SummaryTab versionId="v1" isAdmin lang="en" />);
    expect(screen.getByTestId('sections')).toHaveAttribute('data-admin', 'true');
    expect(screen.getByTestId('draft-summary_full')).toHaveAttribute(
      'data-blocked',
      'Save the summary sections first.'
    );
    // Подсказка у очень краткого уже стоит у поля: шаг закрыт без второй такой же строки.
    expect(screen.getByTestId('draft-summary_brief')).toHaveAttribute('data-blocked', '');
    expect(screen.getAllByText('Save the full summary first.')).toHaveLength(1);
  });

  it('admin, saved sections not loaded — the full step is closed with its own reason', () => {
    mocks.sectionsState = 'error';
    const { unmount } = render(<SummaryTab versionId="v1" isAdmin lang="en" />);
    expect(screen.getByTestId('draft-summary_full')).toHaveAttribute(
      'data-blocked',
      'Failed to load the saved sections.'
    );
    unmount();
    mocks.sectionsState = 'pending';
    render(<SummaryTab versionId="v1" isAdmin lang="en" />);
    expect(screen.getByTestId('draft-summary_full')).toHaveAttribute(
      'data-blocked',
      'Loading the saved sections…'
    );
  });

  it('admin, sections and the full summary saved — both steps open', () => {
    mocks.sections = [{ id: 's1' }];
    mocks.hasText = true;
    render(<SummaryTab versionId="v1" isAdmin lang="en" />);
    expect(screen.getByTestId('draft-summary_full')).toHaveAttribute('data-blocked', 'null');
    expect(screen.getByTestId('draft-summary_brief')).toHaveAttribute('data-blocked', 'null');
  });

  it('the full draft goes into «Summary», the very short one into «Very short summary»', () => {
    mocks.sections = [{ id: 's1' }];
    mocks.hasText = true;
    render(<SummaryTab versionId="v1" isAdmin lang="en" />);
    const full = screen.getByRole('button', { name: 'use Summary' });
    const brief = screen.getByRole('button', { name: 'use Very short summary' });
    // Подтверждение сверяется с тем полем, в которое пойдёт текст.
    expect(full).toHaveAttribute('data-current', '<p>Saved.</p>');
    expect(brief).toHaveAttribute('data-current', '');
    fireEvent.click(brief);
    expect(screen.getByRole('button', { name: 'use Very short summary' })).toHaveAttribute(
      'data-current',
      '<p>summary_brief</p>'
    );
    expect(screen.getByRole('button', { name: 'use Summary' })).toHaveAttribute(
      'data-current',
      '<p>Saved.</p>'
    );
  });

  it('admin, sections saved but no full summary - only the full step is open', () => {
    mocks.sections = [{ id: 's1' }];
    render(<SummaryTab versionId="v1" isAdmin lang="en" />);
    expect(screen.getByTestId('draft-summary_full')).toHaveAttribute('data-blocked', 'null');
    expect(screen.getByTestId('draft-summary_brief')).toHaveAttribute('data-blocked', '');
  });
});
