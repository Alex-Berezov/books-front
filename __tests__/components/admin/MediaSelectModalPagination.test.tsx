import { keepPreviousData, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MediaSelectModal } from '@/components/admin/media/MediaSelectModal';
import { MEDIA_SELECT_PAGE_SIZE } from '@/lib/constants/pagination';
import type { GetMediaParams, MediaFile, MediaType } from '@/types/api-schema/media';

/**
 * A cover field must reach every page of the media library, not only the
 * first one, and a page index must never outlive the list it belongs to.
 */
const file = (id: string): MediaFile => ({
  id,
  url: `/media/${id}.png`,
  filename: `${id}.png`,
  mimeType: 'image/png',
  size: 1024,
  type: 'image',
  createdAt: '2026-11-18T00:00:00.000Z',
  updatedAt: '2026-11-18T00:00:00.000Z',
});

const useMediaFiles = vi.fn();

vi.mock('@/api/hooks/useMedia', () => ({
  useMediaFiles: (...args: unknown[]) => useMediaFiles(...args),
}));

// The toolbar's own widgets are not what is under test here: a stub keeps the
// search box and the type filter one event away.
vi.mock('@/components/admin/media/MediaToolbar', () => ({
  MediaToolbar: (props: {
    search: string;
    onSearchChange: (value: string) => void;
    onTypeFilterChange: (value: MediaType | 'all') => void;
  }) => (
    <div>
      <input
        aria-label="Search files"
        value={props.search}
        onChange={(e) => props.onSearchChange(e.target.value)}
      />
      <button type="button" onClick={() => props.onTypeFilterChange('video')}>
        Show videos
      </button>
    </div>
  ),
}));

vi.mock('@/components/admin/media/MediaUpload', () => ({
  MediaUpload: (props: { onUploadComplete?: (uploaded: number, attempted: number) => void }) => (
    <>
      <button type="button" onClick={() => props.onUploadComplete?.(1, 1)}>
        Finish upload
      </button>
      <button type="button" onClick={() => props.onUploadComplete?.(1, 3)}>
        Partly fail upload
      </button>
      <button type="button" onClick={() => props.onUploadComplete?.(0, 1)}>
        Fail upload
      </button>
    </>
  ),
}));

const lastParams = (): GetMediaParams =>
  useMediaFiles.mock.calls[useMediaFiles.mock.calls.length - 1][0] as GetMediaParams;

const pageOf = (params: GetMediaParams, totalPages = 3) => ({
  data: {
    items: [file(`p${params.page}`)],
    pagination: {
      page: params.page,
      limit: MEDIA_SELECT_PAGE_SIZE,
      total: totalPages * MEDIA_SELECT_PAGE_SIZE,
      totalPages,
    },
  },
  isLoading: false,
  isError: false,
  isPlaceholderData: false,
  refetch: vi.fn(),
});

const modal = (isOpen: boolean, allowedTypes: MediaType[] | undefined = ['image']) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <MediaSelectModal
      isOpen={isOpen}
      onClose={vi.fn()}
      onSelect={vi.fn()}
      allowedTypes={allowedTypes}
    />
  </QueryClientProvider>
);

const goToPage3 = async () => {
  await waitFor(() => expect(screen.getByText('p1.png')).toBeInTheDocument());
  fireEvent.click(screen.getByRole('button', { name: '3' }));
  await waitFor(() => expect(lastParams().page).toBe(3));
};

describe('MediaSelectModal pagination', () => {
  beforeEach(() => {
    useMediaFiles.mockReset();
    useMediaFiles.mockImplementation((params: GetMediaParams) => pageOf(params));
  });

  it('reaches the pages past the first one', async () => {
    render(modal(true));

    await goToPage3();
    expect(screen.getByText('p3.png')).toBeInTheDocument();
    expect(lastParams().limit).toBe(MEDIA_SELECT_PAGE_SIZE);

    fireEvent.click(screen.getByRole('button', { name: 'Previous page' }));
    await waitFor(() => expect(screen.getByText('p2.png')).toBeInTheDocument());
  });

  it('keeps the previous page on screen while the next one loads', () => {
    render(modal(true));

    expect(useMediaFiles).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ placeholderData: keepPreviousData })
    );
  });

  it('dims the previous results while the next ones load and does not clamp against them', async () => {
    const { rerender } = render(modal(true));
    await goToPage3();

    // Page 3 of a new query is loading; on screen is the old answer, which
    // has fewer pages than the page being asked for.
    useMediaFiles.mockImplementation((params: GetMediaParams) => ({
      ...pageOf({ ...params, page: 1 }, 2),
      isPlaceholderData: true,
    }));
    rerender(modal(true));

    await waitFor(() => expect(screen.getByText('p1.png')).toBeInTheDocument());
    expect(screen.getByText('p1.png').closest('[aria-busy="true"]')).not.toBeNull();
    expect(lastParams().page).toBe(3);
  });

  it('returns to the first page when the search changes', async () => {
    render(modal(true));
    await goToPage3();

    fireEvent.change(screen.getByLabelText('Search files'), { target: { value: 'cover' } });

    await waitFor(() =>
      expect(lastParams()).toEqual(expect.objectContaining({ page: 1, search: 'cover' }))
    );
  });

  it('returns to the first page when the type filter changes', async () => {
    render(modal(true, undefined));
    await goToPage3();

    fireEvent.click(screen.getByRole('button', { name: 'Show videos' }));

    await waitFor(() =>
      expect(lastParams()).toEqual(expect.objectContaining({ page: 1, type: 'video' }))
    );
  });

  it('shows the first page of the unfiltered list after an upload', async () => {
    render(modal(true));
    await goToPage3();
    fireEvent.change(screen.getByLabelText('Search files'), { target: { value: 'cover' } });
    fireEvent.click(screen.getByRole('button', { name: '3' }));
    await waitFor(() => expect(lastParams().page).toBe(3));

    fireEvent.click(screen.getByRole('button', { name: 'Upload Files' }));
    fireEvent.click(screen.getByRole('button', { name: 'Finish upload' }));

    await waitFor(() =>
      expect(lastParams()).toEqual(expect.objectContaining({ page: 1, type: 'image' }))
    );
    expect(lastParams().search).toBeUndefined();
    expect(screen.getByText('p1.png')).toBeInTheDocument();
  });

  it('keeps the place in the library when nothing was uploaded', async () => {
    render(modal(true));
    await goToPage3();

    fireEvent.click(screen.getByRole('button', { name: 'Upload Files' }));
    fireEvent.click(screen.getByRole('button', { name: 'Fail upload' }));

    expect(screen.getByRole('button', { name: 'Fail upload' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Media Library' }));
    await waitFor(() => expect(screen.getByText('p3.png')).toBeInTheDocument());
    expect(lastParams().page).toBe(3);
  });

  it('stays on the upload tab when some files failed, with the new ones in view', async () => {
    render(modal(true));
    await goToPage3();
    fireEvent.change(screen.getByLabelText('Search files'), { target: { value: 'cover' } });

    fireEvent.click(screen.getByRole('button', { name: 'Upload Files' }));
    fireEvent.click(screen.getByRole('button', { name: 'Partly fail upload' }));

    expect(screen.getByRole('button', { name: 'Partly fail upload' })).toBeInTheDocument();
    await waitFor(() =>
      expect(lastParams()).toEqual(expect.objectContaining({ page: 1, search: undefined }))
    );
  });

  it('ignores clicks on the dimmed results of the previous query', async () => {
    const { rerender } = render(modal(true));
    await waitFor(() => expect(screen.getByText('p1.png')).toBeInTheDocument());

    useMediaFiles.mockImplementation((params: GetMediaParams) => ({
      ...pageOf({ ...params, page: 1 }),
      isPlaceholderData: true,
    }));
    rerender(modal(true));
    fireEvent.click(screen.getAllByRole('button', { name: /p1\.png/ })[0]);

    expect(screen.getByRole('button', { name: 'Select' })).toBeDisabled();
  });

  it('keeps the page switcher after a partly failed upload on an unchanged first page', async () => {
    // A cached answer keeps its identity between renders, as react-query's does.
    const firstPage = pageOf({ page: 1 });
    useMediaFiles.mockImplementation((params: GetMediaParams) =>
      params.page === 1 && !params.search ? firstPage : pageOf(params)
    );
    render(modal(true));
    await waitFor(() => expect(screen.getByText('p1.png')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Upload Files' }));
    fireEvent.click(screen.getByRole('button', { name: 'Partly fail upload' }));
    fireEvent.click(screen.getByRole('button', { name: 'Media Library' }));

    expect(await screen.findByRole('button', { name: 'Next page' })).toBeInTheDocument();
  });

  it('starts from the first page when reopened', async () => {
    const { rerender } = render(modal(true));
    await goToPage3();

    rerender(modal(false));
    rerender(modal(true));

    await waitFor(() => expect(lastParams().page).toBe(1));
  });

  it('steps back to the last page when the library shrinks under it', async () => {
    const { rerender } = render(modal(true));
    await goToPage3();

    // Files deleted elsewhere: the same list now has two pages.
    useMediaFiles.mockImplementation((params: GetMediaParams) => pageOf(params, 2));
    rerender(modal(true));

    await waitFor(() => expect(lastParams().page).toBe(2));
  });

  it('falls back to the first page when the list empties', async () => {
    const { rerender } = render(modal(true));
    await goToPage3();

    useMediaFiles.mockImplementation((params: GetMediaParams) => ({
      ...pageOf(params, 0),
      data: {
        items: [],
        pagination: { page: params.page, limit: MEDIA_SELECT_PAGE_SIZE, total: 0, totalPages: 0 },
      },
    }));
    rerender(modal(true));

    await waitFor(() => expect(lastParams().page).toBe(1));
  });

  it('forgets the old page count when a new search fails', async () => {
    render(modal(true));
    await goToPage3();

    useMediaFiles.mockImplementation(() => ({
      data: undefined,
      isLoading: false,
      isError: true,
      isPlaceholderData: false,
      refetch: vi.fn(),
    }));
    fireEvent.change(screen.getByLabelText('Search files'), { target: { value: 'logo' } });

    await screen.findByRole('alert');
    expect(screen.queryByRole('button', { name: 'Next page' })).not.toBeInTheDocument();
  });

  it('offers a way back to the first page when a later page fails', async () => {
    const { rerender } = render(modal(true));
    await goToPage3();

    useMediaFiles.mockImplementation((params: GetMediaParams) =>
      params.page === 1
        ? pageOf(params)
        : {
            data: undefined,
            isLoading: false,
            isError: true,
            isPlaceholderData: false,
            refetch: vi.fn(),
          }
    );
    rerender(modal(true));

    await screen.findByRole('alert');
    expect(screen.queryByRole('button', { name: 'Next page' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Back to the first page' }));
    await waitFor(() => expect(screen.getByText('p1.png')).toBeInTheDocument());
  });

  it('draws no page switcher when everything fits on one page', async () => {
    useMediaFiles.mockImplementation((params: GetMediaParams) => ({
      ...pageOf(params, 1),
      data: {
        items: [file('only')],
        pagination: { page: 1, limit: MEDIA_SELECT_PAGE_SIZE, total: 1, totalPages: 1 },
      },
    }));

    render(modal(true));

    await waitFor(() => expect(screen.getByText('only.png')).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: 'Next page' })).not.toBeInTheDocument();
  });
});
