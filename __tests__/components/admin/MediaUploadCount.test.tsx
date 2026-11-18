import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SnackbarProvider } from 'notistack';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MediaUpload } from '@/components/admin/media/MediaUpload';

/**
 * The media picker resets its search and page after an upload so the new file
 * is in view; it must not do that when nothing was uploaded. `MediaUpload`
 * therefore reports how many files of the batch made it.
 */
const upload = vi.fn();

vi.mock('@/api/hooks/useMedia', () => ({
  useUploadMedia: () => ({ mutateAsync: upload }),
}));

const drop = (files: File[]) => {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  fireEvent.change(input, { target: { files } });
};

const png = (name: string) => new File(['x'], name, { type: 'image/png' });

describe('MediaUpload reports the uploaded count', () => {
  beforeEach(() => {
    upload.mockReset();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('counts only the files that made it', async () => {
    upload.mockResolvedValueOnce({}).mockRejectedValueOnce(new Error('413'));
    const onUploadComplete = vi.fn();
    render(
      <SnackbarProvider>
        <MediaUpload onUploadComplete={onUploadComplete} />
      </SnackbarProvider>
    );

    drop([png('a.png'), png('b.png')]);

    await waitFor(() => expect(onUploadComplete).toHaveBeenCalledWith(1, 2));
    expect(screen.getByText('b.png')).toBeInTheDocument();
  });

  it('reports zero when every file failed', async () => {
    upload.mockRejectedValue(new Error('500'));
    const onUploadComplete = vi.fn();
    render(
      <SnackbarProvider>
        <MediaUpload onUploadComplete={onUploadComplete} />
      </SnackbarProvider>
    );

    drop([png('a.png')]);

    await waitFor(() => expect(onUploadComplete).toHaveBeenCalledWith(0, 1));
  });

  it('does not report to a host that has unmounted it', async () => {
    let finish: (value: unknown) => void = () => undefined;
    const pending = new Promise((resolve) => (finish = resolve));
    upload.mockReturnValue(pending);
    const onUploadComplete = vi.fn();
    const { unmount } = render(
      <SnackbarProvider>
        <MediaUpload onUploadComplete={onUploadComplete} />
      </SnackbarProvider>
    );

    drop([png('a.png')]);
    await waitFor(() => expect(upload).toHaveBeenCalled());
    unmount();
    finish({});
    // The batch loop resumes on the settled upload and ends synchronously.
    await pending;
    await Promise.resolve();

    expect(onUploadComplete).not.toHaveBeenCalled();
  });
});
