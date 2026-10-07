import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AudioChapterModal } from '@/components/admin/books/ListenContentTab/AudioChapterModal';
import { ChapterModal } from '@/components/admin/books/ReadContentTab/ChapterModal';

vi.mock('@/components/admin/common/AdminRichTextEditor', () => ({
  AdminRichTextEditor: () => null,
}));

vi.mock('@/components/admin/books/ListenContentTab/AudioPicker', () => ({
  AudioPicker: () => null,
}));

/**
 * The owner's report: a click that missed the chapter dialog closed it and the
 * formatted text was lost. Both chapter forms close only by the cross or Cancel.
 * The editor and the audio picker are stubbed: they need a browser editor and
 * react-query, and closing is decided by the dialog, not by them.
 */
describe.each([
  ['ChapterModal', ChapterModal],
  ['AudioChapterModal', AudioChapterModal],
] as const)('%s close', (_name, Component) => {
  it('stays open on overlay click and Escape, closes by the cross and Cancel', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(<Component isOpen onClose={onClose} onSubmit={vi.fn()} />);

    await user.click(screen.getByRole('dialog').parentElement as HTMLElement);
    await user.click(screen.getAllByRole('textbox')[0]);
    await user.keyboard('{Escape}');
    expect(onClose).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Close modal' }));
    expect(onClose).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
