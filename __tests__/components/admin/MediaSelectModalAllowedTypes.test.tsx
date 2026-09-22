import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MediaSelectModal } from '@/components/admin/media/MediaSelectModal';
import type { MediaFile } from '@/types/api-schema/media';

/**
 * `allowedTypes` was declared in the props type and never read, so a caller
 * asking for an image could be handed an mp3 or a pdf. The editor's "insert
 * image" button would then store `<img src="….pdf">` in a book description,
 * and nothing downstream would catch it: there is no HTML sanitiser on either
 * side (`LEGACY-414`).
 */
const file = (id: string, type: MediaFile['type'], filename: string): MediaFile => ({
  id,
  url: `/media/${filename}`,
  filename,
  mimeType: type === 'image' ? 'image/png' : 'application/pdf',
  size: 1024,
  type,
  createdAt: '2026-09-22T00:00:00.000Z',
  updatedAt: '2026-09-22T00:00:00.000Z',
});

const useMediaFiles = vi.fn();

vi.mock('@/api/hooks/useMedia', () => ({
  useMediaFiles: (...args: unknown[]) => useMediaFiles(...args),
}));

const renderModal = (allowedTypes?: MediaFile['type'][]) => {
  const onSelect = vi.fn();
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  render(
    <QueryClientProvider client={client}>
      <MediaSelectModal isOpen onClose={vi.fn()} onSelect={onSelect} allowedTypes={allowedTypes} />
    </QueryClientProvider>
  );

  return { onSelect };
};

describe('MediaSelectModal allowedTypes', () => {
  it('hides files of other types when the caller restricts them', async () => {
    useMediaFiles.mockReturnValue({
      data: {
        items: [file('1', 'image', 'cover.png'), file('2', 'document', 'contract.pdf')],
        pagination: { page: 1, limit: 50, total: 2, totalPages: 1 },
      },
      isLoading: false,
      refetch: vi.fn(),
    });

    renderModal(['image']);

    await waitFor(() => expect(screen.getByText('cover.png')).toBeInTheDocument());
    expect(screen.queryByText('contract.pdf')).not.toBeInTheDocument();
  });

  it('asks the server for the single permitted type', async () => {
    useMediaFiles.mockReturnValue({
      data: { items: [], pagination: { page: 1, limit: 50, total: 0, totalPages: 0 } },
      isLoading: false,
      refetch: vi.fn(),
    });

    renderModal(['image']);

    await waitFor(() => expect(useMediaFiles).toHaveBeenCalled());
    expect(useMediaFiles).toHaveBeenCalledWith(expect.objectContaining({ type: 'image' }));
  });

  it('shows everything when the caller sets no restriction', async () => {
    useMediaFiles.mockReturnValue({
      data: {
        items: [file('1', 'image', 'cover.png'), file('2', 'document', 'contract.pdf')],
        pagination: { page: 1, limit: 50, total: 2, totalPages: 1 },
      },
      isLoading: false,
      refetch: vi.fn(),
    });

    renderModal();

    await waitFor(() => expect(screen.getByText('cover.png')).toBeInTheDocument());
    expect(screen.getByText('contract.pdf')).toBeInTheDocument();
  });
});
