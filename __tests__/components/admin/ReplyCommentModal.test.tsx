import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ReplyCommentModal } from '@/components/admin/comments/ReplyCommentModal';
import { COMMENT_TEXT_MAX_LENGTH } from '@/lib/constants/comments';

/**
 * A reply is shown to readers as plain text: `BookReviews.tsx` renders `{comment.text}` escaped,
 * because the same field also carries reader reviews (LEGACY-415). A rich editor here would
 * send HTML the reader sees as literal tags.
 */
describe('ReplyCommentModal', () => {
  it('uses a plain textarea with no formatting toolbar', () => {
    render(<ReplyCommentModal isOpen onClose={vi.fn()} onSubmit={vi.fn()} />);

    const field = screen.getByRole('textbox', { name: 'Reply content' });
    expect(field.tagName).toBe('TEXTAREA');
    expect(screen.queryByRole('toolbar')).not.toBeInTheDocument();
  });

  it('submits exactly the typed text, without markup', async () => {
    const onSubmit = vi.fn();
    render(<ReplyCommentModal isOpen onClose={vi.fn()} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByRole('textbox', { name: 'Reply content' }), {
      target: { value: 'Thanks for the review' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Reply' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toEqual({ content: 'Thanks for the review' });
  });

  it('rejects a whitespace-only reply', async () => {
    const onSubmit = vi.fn();
    render(<ReplyCommentModal isOpen onClose={vi.fn()} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByRole('textbox', { name: 'Reply content' }), {
      target: { value: '   ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Reply' }));

    expect(await screen.findByText('Reply content is required')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  // LEGACY-462: сервер не принимает текст длиннее предела — форма отбивает его сама, а не молча.
  it('rejects a reply longer than the server limit', async () => {
    const onSubmit = vi.fn();
    render(<ReplyCommentModal isOpen onClose={vi.fn()} onSubmit={onSubmit} />);

    const field = screen.getByRole('textbox', { name: 'Reply content' });
    expect(field).toHaveAttribute('maxLength', String(COMMENT_TEXT_MAX_LENGTH));
    fireEvent.change(field, { target: { value: 'a'.repeat(COMMENT_TEXT_MAX_LENGTH + 1) } });
    fireEvent.click(screen.getByRole('button', { name: 'Reply' }));

    expect(
      await screen.findByText(`Reply must be at most ${COMMENT_TEXT_MAX_LENGTH} characters`)
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('accepts a reply of exactly the server limit', async () => {
    const onSubmit = vi.fn();
    render(<ReplyCommentModal isOpen onClose={vi.fn()} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByRole('textbox', { name: 'Reply content' }), {
      target: { value: 'a'.repeat(COMMENT_TEXT_MAX_LENGTH) },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Reply' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
  });
});
