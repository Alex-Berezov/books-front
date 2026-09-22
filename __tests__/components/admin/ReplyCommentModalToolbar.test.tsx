import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ReplyCommentModal } from '@/components/admin/comments/ReplyCommentModal';

/**
 * A reply is shown to readers as plain text: `BookReviews.tsx` renders
 * `{comment.text}` and React escapes it, because the same field also carries
 * reader-written reviews and rendering those as HTML would be an XSS hole.
 *
 * So this form must not offer formatting the reader will never see - an image
 * would arrive as a literal `<img src="…">` string in the page. Nothing else
 * guards that: typecheck and lint stay green if someone swaps this form to
 * `AdminRichTextEditor` to match the others.
 */
describe('ReplyCommentModal toolbar', () => {
  const renderModal = () =>
    render(<ReplyCommentModal isOpen onClose={vi.fn()} onSubmit={vi.fn()} />);

  it('offers no image button - a reply is rendered as plain text', async () => {
    renderModal();

    await screen.findByRole('toolbar', { name: 'Text formatting' });

    expect(screen.queryByRole('button', { name: 'Insert image' })).not.toBeInTheDocument();
  });

  it('offers no alignment - it would reach the reader as a style attribute', async () => {
    renderModal();

    await screen.findByRole('toolbar', { name: 'Text formatting' });

    for (const label of ['Align left', 'Align center', 'Align right', 'Justify']) {
      expect(screen.queryByRole('button', { name: label })).not.toBeInTheDocument();
    }
  });

  it('keeps the formatting the reply flow already had', async () => {
    renderModal();

    await screen.findByRole('toolbar', { name: 'Text formatting' });

    expect(screen.getByRole('button', { name: 'Bold' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Insert link' })).toBeInTheDocument();
  });
});
