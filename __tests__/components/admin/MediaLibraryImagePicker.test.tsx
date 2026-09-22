import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MediaLibraryImagePicker } from '@/components/admin/media/MediaLibraryImagePicker';
import type { MediaSelectModalProps } from '@/components/admin/media/MediaSelectModal';

/**
 * The adapter is the only thing standing between the media library and the
 * editor: it pins `allowedTypes` to images and turns a `MediaFile` into the
 * `{ url, alt }` the editor stores. Renaming `filename` on `MediaFile`, or
 * taking `alt` from the url by mistake, is caught by nothing else - the editor
 * test substitutes its own picker and never loads this file.
 */
const selectModalProps = vi.fn();

vi.mock('@/components/admin/media/MediaSelectModal', () => ({
  MediaSelectModal: (props: MediaSelectModalProps) => {
    selectModalProps(props);
    return (
      <button
        type="button"
        onClick={() =>
          props.onSelect({
            id: 'media-1',
            url: '/media/cover.png',
            filename: 'cover.png',
            mimeType: 'image/png',
            size: 2048,
            type: 'image',
            createdAt: '2026-09-22T00:00:00.000Z',
            updatedAt: '2026-09-22T00:00:00.000Z',
          })
        }
      >
        Choose file
      </button>
    );
  },
}));

describe('MediaLibraryImagePicker', () => {
  it('restricts the library to images', () => {
    render(<MediaLibraryImagePicker isOpen onClose={vi.fn()} onSelect={vi.fn()} />);

    expect(selectModalProps).toHaveBeenCalledWith(
      expect.objectContaining({ allowedTypes: ['image'] })
    );
  });

  it('hands the editor the url and an alt text', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(<MediaLibraryImagePicker isOpen onClose={vi.fn()} onSelect={onSelect} />);
    await user.click(screen.getByRole('button', { name: 'Choose file' }));

    expect(onSelect).toHaveBeenCalledWith({ url: '/media/cover.png', alt: 'cover.png' });
  });
});
