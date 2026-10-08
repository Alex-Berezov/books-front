import { act, render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ListenContentTab } from '@/components/admin/books/ListenContentTab';
import { useListenContentTab } from '@/components/admin/books/ListenContentTab/useListenContentTab';
import { ReadContentTab } from '@/components/admin/books/ReadContentTab';
import { useReadContentTab } from '@/components/admin/books/ReadContentTab/useReadContentTab';

const mocks = vi.hoisted(() => ({
  state: {
    rows: undefined as unknown[] | undefined,
    error: null as Error | null,
    fetching: false,
  },
  enqueueSnackbar: vi.fn(),
  refetch: vi.fn(),
}));

vi.mock('notistack', () => ({ useSnackbar: () => ({ enqueueSnackbar: mocks.enqueueSnackbar }) }));

vi.mock('@/components/admin/common/AdminRichTextEditor', () => ({
  AdminRichTextEditor: () => null,
}));
vi.mock('@/components/admin/books/ListenContentTab/AudioPicker', () => ({
  AudioPicker: () => null,
}));

vi.mock('@/api/hooks', () => {
  // Text chapters come as `{ items }`, audio chapters as the whole array (LEGACY-441).
  const query = (wrap: (rows: unknown[]) => unknown) => () => ({
    data: mocks.state.rows && wrap(mocks.state.rows),
    error: mocks.state.error,
    isLoading: false,
    isFetching: mocks.state.fetching,
    refetch: mocks.refetch,
  });
  const mutation = () => ({ mutateAsync: vi.fn(), isPending: false });
  return {
    useChapters: query((rows) => ({ items: rows })),
    useAllAudioChapters: query((rows) => rows),
    useCreateChapter: mutation,
    useCreateAudioChapter: mutation,
    useUpdateChapter: mutation,
    useUpdateAudioChapter: mutation,
    useDeleteChapter: mutation,
    useDeleteAudioChapter: mutation,
  };
});

const items = [{ id: 'c1', number: 1, title: 'Kept chapter', duration: 60, content: '' }];

/**
 * A failed refetch keeps the loaded list (react-query leaves `data`, sets `error`): the tab
 * must not swap itself for a full-screen stub, which would unmount an open chapter dialog
 * with the typed input (LEGACY-440).
 */
describe.each([
  ['ReadContentTab', () => <ReadContentTab versionId="v1" />, '+ Add Chapter'],
  ['ListenContentTab', () => <ListenContentTab versionId="v1" />, '+ Add Audio Chapter'],
] as const)('%s on query error', (_name, view, addLabel) => {
  beforeEach(() => {
    mocks.state = { rows: undefined, error: null, fetching: false };
    mocks.enqueueSnackbar.mockReset();
    mocks.refetch.mockReset();
  });

  it('keeps the loaded list and shows the error as a line', () => {
    mocks.state = { rows: items, error: new Error('offline'), fetching: false };
    render(view());

    expect(screen.getByText(/Kept chapter/)).toBeInTheDocument();
    expect(screen.getByText(/offline/)).toBeInTheDocument();
  });

  it('keeps an open dialog with the typed input when a refetch fails', async () => {
    const user = userEvent.setup();
    mocks.state = { rows: items, error: null, fetching: false };
    const { rerender } = render(view());

    await user.click(screen.getByRole('button', { name: addLabel }));
    await user.type(screen.getAllByRole('textbox')[0], 'Typed title');

    mocks.state = { rows: items, error: new Error('offline'), fetching: false };
    rerender(view());

    expect(screen.getAllByRole('textbox')[0]).toHaveValue('Typed title');
    expect(screen.getByText(/offline/)).toBeInTheDocument();
  });

  it('does not open a new chapter while the list is being refetched (LEGACY-441)', async () => {
    const user = userEvent.setup();
    mocks.state = { rows: items, error: null, fetching: true };
    render(view());

    // The loading spinner adds its own label to the button name.
    const add = screen.getByRole('button', { name: new RegExp(addLabel.replace('+ ', '')) });
    expect(add).toHaveClass('ant-btn-loading');
    await user.click(add);

    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(mocks.refetch).not.toHaveBeenCalled();
  });

  it('does not open a new chapter over a stale list (LEGACY-441)', async () => {
    const user = userEvent.setup();
    mocks.state = { rows: items, error: new Error('offline'), fetching: false };
    render(view());

    await user.click(screen.getByRole('button', { name: addLabel }));

    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(mocks.refetch).toHaveBeenCalledTimes(1);
    expect(mocks.enqueueSnackbar).toHaveBeenCalledTimes(1);
    expect(mocks.enqueueSnackbar).toHaveBeenCalledWith(expect.stringMatching(/out of date/), {
      variant: 'warning',
    });
  });

  it('suggests the number after the highest chapter of the loaded list', async () => {
    const user = userEvent.setup();
    const many = Array.from({ length: 120 }, (_, i) => ({
      ...items[0],
      id: `c${i}`,
      number: i + 1,
    }));
    mocks.state = { rows: many, error: null, fetching: false };
    render(view());

    await user.click(screen.getByRole('button', { name: addLabel }));

    expect(screen.getByRole('spinbutton')).toHaveValue(121);
  });

  it('shows loading on the empty-state button while the list is being refetched', () => {
    mocks.state = { rows: [], error: null, fetching: true };
    render(view());

    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(1);
    for (const button of buttons) expect(button).toHaveClass('ant-btn-loading');
  });

  it('shows only the error when there is no data', () => {
    mocks.state = { rows: undefined, error: new Error('offline'), fetching: false };
    render(view());

    expect(screen.getByText(/offline/)).toBeInTheDocument();
    expect(screen.queryByText(/Kept chapter/)).not.toBeInTheDocument();
  });
});

/**
 * The button spinner is not the only guard: the add handler itself keeps the dialog closed
 * while the list is being refetched, whoever calls it (the empty-state upload entry too).
 */
describe.each([
  [
    'useReadContentTab',
    () => {
      const tab = useReadContentTab({ versionId: 'v1' });
      return { isOpen: tab.isModalOpen, add: tab.handleAddChapter };
    },
  ],
  [
    'useListenContentTab',
    () => {
      const tab = useListenContentTab({ versionId: 'v1' });
      return { isOpen: tab.isModalOpen, add: tab.handleAddAudioChapter };
    },
  ],
] as const)('%s add during refetch', (_name, useTab) => {
  it('keeps the dialog closed until the list is fresh (LEGACY-441)', () => {
    mocks.state = { rows: items, error: null, fetching: true };
    const { result, rerender } = renderHook(useTab);

    act(() => result.current.add());
    expect(result.current.isOpen).toBe(false);

    mocks.state = { rows: items, error: null, fetching: false };
    rerender();
    act(() => result.current.add());
    expect(result.current.isOpen).toBe(true);
  });
});
