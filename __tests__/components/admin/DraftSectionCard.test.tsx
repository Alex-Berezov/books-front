import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DraftSectionCard } from '@/components/admin/books/SummaryTab/SummaryDraft';
import type { ContentDraftSection } from '@/types/api-schema';

/**
 * F05-10: карточка-черновик раздела — сохраняется «Add section» как набранная руками, затем
 * заготовка отмечает раздел добавленным (Р1); упала отметка — повторяется только отметка, не
 * создание; добавленный раздел второй раз не предлагается и не правится здесь.
 */

vi.mock('@/components/admin/common/AdminRichTextEditor', () => ({
  AdminRichTextEditor: (props: { ariaLabel?: string; value: string }) => (
    <textarea aria-label={props.ariaLabel} defaultValue={props.value} />
  ),
}));

const section = (patch: Partial<ContentDraftSection> = {}): ContentDraftSection => ({
  number: 2,
  title: 'Chapters 2-3',
  text: '<p>Draft.</p>',
  readerChapter: 2,
  readerChapterMissing: false,
  additions: null,
  question: null,
  ...patch,
});

const card = (
  props: Partial<Parameters<typeof DraftSectionCard>[0]> & {
    onAdd?: ReturnType<typeof vi.fn>;
    onMarkAdded?: ReturnType<typeof vi.fn>;
  } = {}
) => (
  <DraftSectionCard
    section={section()}
    onAdd={vi.fn().mockResolvedValue(true)}
    onMarkAdded={vi.fn().mockResolvedValue({})}
    adding={false}
    added={false}
    readOnly={false}
    {...props}
  />
);

describe('DraftSectionCard', () => {
  it('«Add section» creates the section once, marks it once, and the card is closed', async () => {
    const onAdd = vi.fn().mockResolvedValue(true);
    const onMarkAdded = vi.fn().mockResolvedValue({});
    render(card({ onAdd, onMarkAdded }));
    fireEvent.click(screen.getByRole('button', { name: 'Add section' }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Saved as a section'));
    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(onAdd).toHaveBeenCalledWith({
      title: 'Chapters 2-3',
      text: '<p>Draft.</p>',
      readerChapter: '2',
    });
    expect(onMarkAdded).toHaveBeenCalledTimes(1);
    expect(onMarkAdded).toHaveBeenCalledWith(2);
    // Добавленный раздел здесь не правится: правки ушли бы в никуда.
    expect(screen.queryByLabelText('Draft section 2 text')).not.toBeInTheDocument();
  });

  it('the create refusal stays on the card, nothing is marked', async () => {
    const onMarkAdded = vi.fn();
    render(card({ onAdd: vi.fn().mockResolvedValue('Title is too long'), onMarkAdded }));
    fireEvent.click(screen.getByRole('button', { name: 'Add section' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Title is too long'));
    expect(onMarkAdded).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Add section' })).toBeInTheDocument();
  });

  it('the mark failed - only the mark is retried, the section is not created again', async () => {
    const onAdd = vi.fn().mockResolvedValue(true);
    const onMarkAdded = vi.fn().mockRejectedValueOnce(new Error('network')).mockResolvedValue({});
    render(card({ onAdd, onMarkAdded }));
    fireEvent.click(screen.getByRole('button', { name: 'Add section' }));
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('the draft did not record it')
    );
    expect(screen.queryByRole('button', { name: 'Add section' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry the mark' }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Saved as a section'));
    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(onMarkAdded).toHaveBeenCalledTimes(2);
  });

  it('marked on the server (after a reload) - no «Add section», whatever the titles', () => {
    render(card({ added: true }));
    expect(screen.queryByRole('button', { name: 'Add section' })).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Saved as a section');
  });

  it('no plan chapter in this version - empty reader chapter and the hint; empty text - the hint', () => {
    render(
      card({ section: section({ readerChapter: null, readerChapterMissing: true, text: '' }) })
    );
    expect(screen.getByLabelText('Reader chapter')).toHaveValue(null);
    expect(screen.getByText(/set the reader chapter by hand/)).toBeInTheDocument();
    expect(screen.getByText(/the title is from the dossier plan/)).toBeInTheDocument();
  });

  it('a draft that is not ready - the card is read only, no «Add section»', () => {
    const onAdd = vi.fn();
    render(card({ readOnly: true, onAdd }));
    expect(screen.queryByRole('button', { name: 'Add section' })).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('sections can be added once it is ready');
    expect(onAdd).not.toHaveBeenCalled();
  });
});
