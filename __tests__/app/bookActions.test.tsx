import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import BookActions from '@/app/[lang]/book/[slug]/BookActions';
import type { VersionPreview } from '@/types/api-schema/books';

const push = vi.fn();
const sessionStatus = { value: 'authenticated' as 'authenticated' | 'unauthenticated' };
const shelfItems = { value: [] as Array<{ bookVersion: { id: string; bookId: string } }> };
const addMutate = vi.fn();
const removeMutate = vi.fn();
const messageError = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, back: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/en/book/dracula',
}));

vi.mock('next-auth/react', () => ({
  useSession: () => ({ status: sessionStatus.value }),
}));

vi.mock('antd', () => ({
  message: {
    error: (...args: unknown[]) => messageError(...args),
    success: vi.fn(),
  },
}));

vi.mock('@/api/hooks/useBookshelf', () => ({
  useBookshelf: () => ({ data: { items: shelfItems.value } }),
  useAddToBookshelf: () => ({ mutate: addMutate, isPending: false }),
  useRemoveFromBookshelf: () => ({ mutate: removeMutate, isPending: false }),
}));

const textVersion = { id: 'v-text', isFree: true } as unknown as VersionPreview;

const renderActions = (audioVersion: VersionPreview | null = null) =>
  render(
    <BookActions
      slug="dracula"
      lang="en"
      bookId="b-1"
      versionId="v-text"
      textVersion={textVersion}
      audioVersion={audioVersion}
      hasSummary={false}
    />
  );

describe('BookActions — CTA hierarchy and bookshelf toggle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStatus.value = 'authenticated';
    shelfItems.value = [];
  });

  it('renders Read Free first and omits Listen when the book has no audio edition', () => {
    renderActions(null);

    expect(screen.getByRole('link', { name: /Read Free/ })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Listen/ })).not.toBeInTheDocument();
  });

  it('renders Listen when an audio edition exists', () => {
    renderActions({ id: 'v-audio' } as unknown as VersionPreview);

    expect(screen.getByRole('link', { name: /Listen/ })).toBeInTheDocument();
  });

  it('exposes the unsaved state through aria-pressed', () => {
    renderActions();

    const button = screen.getByRole('button', { name: /Add to Bookshelf/ });
    expect(button).toHaveAttribute('aria-pressed', 'false');
  });

  it('shows the saved label and aria-pressed when the book is already on the shelf', () => {
    shelfItems.value = [{ bookVersion: { id: 'v-text', bookId: 'b-1' } }];
    renderActions();

    const button = screen.getByRole('button', { name: /In Your Bookshelf/ });
    expect(button).toHaveAttribute('aria-pressed', 'true');
  });

  it('reveals the remove label on hover while saved, and restores it on unhover', async () => {
    const user = userEvent.setup();
    shelfItems.value = [{ bookVersion: { id: 'v-text', bookId: 'b-1' } }];
    renderActions();

    const button = screen.getByRole('button', { name: /In Your Bookshelf/ });

    await user.hover(button);
    expect(screen.getByRole('button', { name: /Remove from Bookshelf/ })).toBeInTheDocument();

    await user.unhover(button);
    expect(screen.getByRole('button', { name: /In Your Bookshelf/ })).toBeInTheDocument();
  });

  it('keeps the unsaved label untouched on hover', async () => {
    const user = userEvent.setup();
    renderActions();

    const button = screen.getByRole('button', { name: /Add to Bookshelf/ });
    await user.hover(button);

    expect(screen.getByRole('button', { name: /Add to Bookshelf/ })).toBeInTheDocument();
  });

  it('updates optimistically on add and reverts with an error toast when the request fails', async () => {
    const user = userEvent.setup();
    addMutate.mockImplementation((_id: string, opts: { onError: () => void }) => {
      // Simulate a failing request resolving after the optimistic flip.
      setTimeout(() => opts.onError(), 0);
    });
    renderActions();

    await user.click(screen.getByRole('button', { name: /Add to Bookshelf/ }));

    // Optimistic flip happened before the request settled.
    expect(addMutate).toHaveBeenCalledWith('v-text', expect.any(Object));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Add to Bookshelf/ })).toHaveAttribute(
        'aria-pressed',
        'false'
      );
    });
    expect(messageError).toHaveBeenCalled();
  });

  it('reverts an optimistic removal when the request fails', async () => {
    const user = userEvent.setup();
    shelfItems.value = [{ bookVersion: { id: 'v-text', bookId: 'b-1' } }];
    removeMutate.mockImplementation((_id: string, opts: { onError: () => void }) => {
      setTimeout(() => opts.onError(), 0);
    });
    renderActions();

    await user.click(screen.getByRole('button', { name: /In Your Bookshelf/ }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Bookshelf/ })).toHaveAttribute(
        'aria-pressed',
        'true'
      );
    });
    expect(messageError).toHaveBeenCalled();
  });

  it('sends anonymous users to sign-in instead of mutating the shelf', async () => {
    const user = userEvent.setup();
    sessionStatus.value = 'unauthenticated';
    renderActions();

    await user.click(screen.getByRole('button', { name: /Add to Bookshelf/ }));

    expect(push).toHaveBeenCalledWith('/en/auth/sign-in?callbackUrl=/en/book/dracula');
    expect(addMutate).not.toHaveBeenCalled();
  });
});
