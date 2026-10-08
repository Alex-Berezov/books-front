import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import BookshelfClient from '@/app/[lang]/bookshelf/BookshelfClient';
import type { BookshelfItemDto, BookshelfListResponse } from '@/types/api-schema';

/**
 * Полка без antd (`LEGACY-442`): своё окно подтверждения удаления и свои вкладки.
 * Хуки данных подменены — проверяется поведение страницы, а не сеть.
 */

const removeMutateAsync = vi.fn();
const toastSuccess = vi.fn();
const toastError = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), replace: vi.fn() }),
  useParams: () => ({ lang: 'en' }),
  usePathname: () => '/en/bookshelf',
}));

vi.mock('next-auth/react', () => ({
  useSession: () => ({ data: { user: { id: 'u-1' } }, status: 'authenticated' }),
}));

vi.mock('@/lib/utils/toast', () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccess(...args),
    error: (...args: unknown[]) => toastError(...args),
  },
}));

vi.mock('@/lib/reading-progress', () => ({
  useProgressIdentity: () => ({ target: 'server', userId: 'u-1' }),
}));

vi.mock('@/api/hooks/useProgress', () => ({
  useProgress: () => ({ data: undefined }),
}));

// Полная форма ответа `GET /me/bookshelf`: тип не даёт фикстуре разойтись с контрактом.
// Пустой `coverImageUrl` — книга без обложки, карточка рисует букву.
const version = {
  language: 'en',
  description: '',
  coverImageUrl: '',
  isFree: false,
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
};

const shelfItems: BookshelfItemDto[] = [
  {
    id: 'e-1',
    addedAt: '2026-10-02T00:00:00.000Z',
    bookVersion: {
      ...version,
      id: 'v-text',
      bookId: 'b-1',
      slug: 'dracula',
      title: 'Dracula',
      author: 'Bram Stoker',
      type: 'text',
      chaptersCount: 10,
    },
  },
  {
    id: 'e-2',
    addedAt: '2026-10-03T00:00:00.000Z',
    bookVersion: {
      ...version,
      id: 'v-audio',
      bookId: 'b-2',
      slug: 'emma',
      title: 'Emma',
      author: 'Jane Austen',
      type: 'audio',
      chaptersCount: 0,
    },
  },
];

const shelfResponse: BookshelfListResponse = {
  items: shelfItems,
  pagination: { page: 1, limit: 20, total: shelfItems.length, totalPages: 1, hasNext: false },
};

vi.mock('@/api/hooks/useBookshelf', () => ({
  useBookshelf: () => ({ data: shelfResponse, isLoading: false }),
  useRemoveFromBookshelf: () => ({ mutateAsync: removeMutateAsync }),
}));

const openRemoveDialogFor = async (title: string) => {
  const user = userEvent.setup();
  const card = screen.getByRole('heading', { name: title }).closest('div') as HTMLElement;
  await user.click(within(card).getByRole('button', { name: 'Remove' }));
  return { user, dialog: await screen.findByRole('dialog') };
};

describe('BookshelfClient — remove confirmation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    removeMutateAsync.mockResolvedValue(undefined);
  });

  it('opens a modal dialog with the book title, and Cancel does not remove', async () => {
    render(<BookshelfClient />);
    const { user, dialog } = await openRemoveDialogFor('Dracula');

    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(within(dialog).getByText('Remove from Bookshelf?')).toBeInTheDocument();
    expect(within(dialog).getByText(/"Dracula"/)).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(removeMutateAsync).not.toHaveBeenCalled();
    expect(toastSuccess).not.toHaveBeenCalled();
  });

  it('closes on Escape without removing', async () => {
    render(<BookshelfClient />);
    const { user } = await openRemoveDialogFor('Dracula');

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(removeMutateAsync).not.toHaveBeenCalled();
  });

  it('stays open on an overlay click, as Modal.confirm did (maskClosable: false)', async () => {
    render(<BookshelfClient />);
    const { user, dialog } = await openRemoveDialogFor('Dracula');

    await user.click(dialog.parentElement as HTMLElement);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(removeMutateAsync).not.toHaveBeenCalled();
  });

  it('Remove calls the mutation with the version id and shows a success toast', async () => {
    render(<BookshelfClient />);
    const { user, dialog } = await openRemoveDialogFor('Dracula');

    await user.click(within(dialog).getByRole('button', { name: 'Remove' }));

    expect(removeMutateAsync).toHaveBeenCalledTimes(1);
    expect(removeMutateAsync).toHaveBeenCalledWith('v-text');
    await waitFor(() =>
      expect(toastSuccess).toHaveBeenCalledWith('Removed "Dracula" from bookshelf')
    );
    expect(toastError).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('shows an error toast and closes the dialog when removal fails', async () => {
    removeMutateAsync.mockRejectedValueOnce(new Error('boom'));
    render(<BookshelfClient />);
    const { user, dialog } = await openRemoveDialogFor('Emma');

    await user.click(within(dialog).getByRole('button', { name: 'Remove' }));

    expect(removeMutateAsync).toHaveBeenCalledWith('v-audio');
    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith('Failed to remove book from bookshelf')
    );
    expect(toastSuccess).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});

describe('BookshelfClient — tabs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts on "All" and switches the list by click', async () => {
    const user = userEvent.setup();
    render(<BookshelfClient />);

    const all = screen.getByRole('tab', { name: 'All (2)' });
    const text = screen.getByRole('tab', { name: 'Text Books (1)' });
    const audio = screen.getByRole('tab', { name: 'Audiobooks (1)' });

    expect(all).toHaveAttribute('aria-selected', 'true');
    expect(text).toHaveAttribute('aria-selected', 'false');
    const panel = screen.getByRole('tabpanel');
    expect(all).toHaveAttribute('aria-controls', panel.id);
    expect(within(panel).getByText('Dracula')).toBeInTheDocument();
    expect(within(panel).getByText('Emma')).toBeInTheDocument();

    await user.click(audio);

    expect(audio).toHaveAttribute('aria-selected', 'true');
    expect(all).toHaveAttribute('aria-selected', 'false');
    const audioPanel = screen.getByRole('tabpanel');
    expect(audio).toHaveAttribute('aria-controls', audioPanel.id);
    expect(within(audioPanel).getByText('Emma')).toBeInTheDocument();
    expect(within(audioPanel).queryByText('Dracula')).not.toBeInTheDocument();

    await user.click(text);

    const textPanel = screen.getByRole('tabpanel');
    expect(within(textPanel).getByText('Dracula')).toBeInTheDocument();
    expect(within(textPanel).queryByText('Emma')).not.toBeInTheDocument();
  });

  it('moves selection and focus with arrow keys, wrapping around', async () => {
    const user = userEvent.setup();
    render(<BookshelfClient />);

    const all = screen.getByRole('tab', { name: 'All (2)' });
    const text = screen.getByRole('tab', { name: 'Text Books (1)' });
    const audio = screen.getByRole('tab', { name: 'Audiobooks (1)' });

    expect(all).toHaveAttribute('tabindex', '0');
    expect(text).toHaveAttribute('tabindex', '-1');

    all.focus();
    await user.keyboard('{ArrowRight}');
    expect(text).toHaveFocus();
    expect(text).toHaveAttribute('aria-selected', 'true');

    await user.keyboard('{ArrowLeft}{ArrowLeft}');
    expect(audio).toHaveFocus();
    expect(audio).toHaveAttribute('aria-selected', 'true');
    expect(within(screen.getByRole('tabpanel')).queryByText('Dracula')).not.toBeInTheDocument();

    await user.keyboard('{ArrowRight}');
    expect(all).toHaveFocus();
    expect(all).toHaveAttribute('aria-selected', 'true');
  });
});
