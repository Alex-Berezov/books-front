import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SummarySections } from '@/components/admin/books/SummaryTab/SummarySections';
import type { ContentDraft } from '@/types/api-schema';

/**
 * F05-10: заготовка разделов в списке разделов вкладки — только у `admin` (В8); карточки
 * получают «Add section» вкладки и признак уже сохранённого раздела с тем же заголовком.
 */

const addSection = vi.fn();
vi.mock('@/components/admin/books/SummaryTab/useSummarySections', () => ({
  SECTION_READER_CHAPTER_MAX: 10_000,
  SECTION_TITLE_MAX_LENGTH: 200,
  useSummarySections: () => ({
    sections: [{ id: 's1', number: 1, title: 'Chapter 1', readerChapter: 1, updatedAt: '' }],
    isLoading: false,
    loadError: null,
    warnings: {},
    addWarnings: [],
    clearAddWarnings: vi.fn(),
    addSection,
    saveSection: vi.fn(),
    requestDelete: vi.fn(),
    requestMove: vi.fn(),
    isAdding: false,
    isReordering: false,
    isChangingOrder: false,
    pending: null,
    pendingMessage: '',
    confirmPending: vi.fn(),
    cancelPending: vi.fn(),
  }),
}));
vi.mock('@/components/admin/books/SummaryTab/SummarySectionCard', () => ({
  SummarySectionCard: () => null,
}));
vi.mock('@/components/admin/common/AdminRichTextEditor', () => ({
  AdminRichTextEditor: () => null,
}));

const draft = {
  id: 'd1',
  sections: [
    { number: 1, title: 'Chapter 1' },
    { number: 2, title: 'Chapters 2-3' },
  ],
  addedSections: [2],
  status: 'ready',
} as unknown as ContentDraft;
const markAdded = vi.fn();

// Заготовка — заглушка, которая сразу отдаёт карточки; карточка — заглушка с признаками.
vi.mock('next/dynamic', () => ({
  default: (load: () => Promise<unknown>) => {
    if (load.toString().includes('DraftSectionCard')) {
      const Card = (props: {
        section: { number: number };
        added: boolean;
        readOnly: boolean;
        onAdd: unknown;
        onMarkAdded: unknown;
      }) => (
        <div
          data-testid={`card-${props.section.number}`}
          data-saved={String(props.added)}
          data-readonly={String(props.readOnly)}
          data-add={String(props.onAdd === addSection)}
          data-mark={String(props.onMarkAdded === markAdded)}
        />
      );
      return Card;
    }
    const Draft = (props: {
      kind: string;
      children: (d: ContentDraft, t: { markAdded: unknown }) => unknown;
    }) => (
      <div data-testid={`draft-${props.kind}`}>{props.children(draft, { markAdded }) as never}</div>
    );
    return Draft;
  },
}));

describe('SummarySections: section drafts', () => {
  it('content_manager — no sections draft', () => {
    render(<SummarySections versionId="v1" isAdmin={false} />);
    expect(screen.queryByTestId('draft-summary_sections')).not.toBeInTheDocument();
  });

  it('admin — cards with the tab «Add section» and the draft mark; added by the server mark, not by title', () => {
    render(<SummarySections versionId="v1" isAdmin lang="en" />);
    expect(screen.getByTestId('draft-summary_sections')).toBeInTheDocument();
    // Раздел 1 совпадает заголовком с сохранённым, но не отмечен сервером — предлагается.
    expect(screen.getByTestId('card-1')).toHaveAttribute('data-saved', 'false');
    expect(screen.getByTestId('card-2')).toHaveAttribute('data-saved', 'true');
    expect(screen.getByTestId('card-1')).toHaveAttribute('data-add', 'true');
    expect(screen.getByTestId('card-1')).toHaveAttribute('data-mark', 'true');
  });

  it('building or failed draft - cards are read only; ready - not', () => {
    for (const [status, readOnly] of [
      ['building', 'true'],
      ['failed', 'true'],
      ['ready', 'false'],
    ] as const) {
      (draft as unknown as { status: string }).status = status;
      const { unmount } = render(<SummarySections versionId="v1" isAdmin lang="en" />);
      expect(screen.getByTestId('card-1')).toHaveAttribute('data-readonly', readOnly);
      unmount();
    }
  });
});
