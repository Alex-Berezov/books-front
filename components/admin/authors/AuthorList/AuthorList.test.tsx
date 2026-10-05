import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthorList } from './AuthorList';

const useAuthorsMock = vi.fn();

vi.mock('@/api/hooks/useAuthors', () => ({
  useAuthors: (params: unknown) => useAuthorsMock(params),
  useDeleteAuthor: () => ({ mutateAsync: vi.fn() }),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('notistack', () => ({ useSnackbar: () => ({ enqueueSnackbar: vi.fn() }) }));
vi.mock('../CreateAuthorModal', () => ({ CreateAuthorModal: () => null }));

const page = (total: number, totalPages: number) => ({
  data: { items: [], pagination: { page: 1, limit: 20, total, totalPages } },
  isLoading: false,
  error: null,
});

describe('AuthorList search (LEGACY-352)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useAuthorsMock.mockReset();
    useAuthorsMock.mockReturnValue(page(0, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const typeSearch = (value: string) =>
    fireEvent.change(screen.getByPlaceholderText(/Search authors/i), { target: { value } });

  it('sends the typed term to the server only after the debounce', () => {
    render(<AuthorList lang="en" />);
    expect(useAuthorsMock).toHaveBeenLastCalledWith({ page: 1, limit: 20, search: undefined });

    typeSearch('tolstoy');
    act(() => vi.advanceTimersByTime(499));
    expect(useAuthorsMock).not.toHaveBeenCalledWith(expect.objectContaining({ search: 'tolstoy' }));

    act(() => vi.advanceTimersByTime(1));
    expect(useAuthorsMock).toHaveBeenLastCalledWith({ page: 1, limit: 20, search: 'tolstoy' });
  });

  it('does not send a whitespace-only term', () => {
    render(<AuthorList lang="en" />);
    typeSearch('   ');
    act(() => vi.advanceTimersByTime(500));

    expect(useAuthorsMock).toHaveBeenLastCalledWith({ page: 1, limit: 20, search: undefined });
  });

  // Сброс страницы — в момент, когда новый терм уходит в запрос, а не по вводу:
  // иначе уходит лишний запрос «страница 1 со старым термом».
  it('restarts from page 1 together with the new term, without an extra request', () => {
    useAuthorsMock.mockReturnValue(page(60, 3));
    render(<AuthorList lang="en" />);
    fireEvent.click(screen.getByRole('button', { name: '3' }));
    expect(useAuthorsMock).toHaveBeenLastCalledWith({ page: 3, limit: 20, search: undefined });

    const callsBeforeTyping = useAuthorsMock.mock.calls.length;
    typeSearch('tolstoy');
    expect(useAuthorsMock.mock.calls.slice(callsBeforeTyping)).not.toContainEqual([
      { page: 1, limit: 20, search: undefined },
    ]);

    act(() => vi.advanceTimersByTime(500));
    expect(useAuthorsMock).toHaveBeenLastCalledWith({ page: 1, limit: 20, search: 'tolstoy' });
  });

  // Удалили последнего автора последней страницы: страница за концом списка
  // показала бы «пусто» без пагинатора и без пути назад.
  it('moves back to the last page when the result shrinks', () => {
    useAuthorsMock.mockReturnValue(page(40, 2));
    const { rerender } = render(<AuthorList lang="en" />);
    fireEvent.click(screen.getByRole('button', { name: '2' }));

    useAuthorsMock.mockReturnValue(page(20, 1));
    rerender(<AuthorList lang="en" />);

    expect(useAuthorsMock).toHaveBeenLastCalledWith({ page: 1, limit: 20, search: undefined });
  });

  it('keeps the search field when a request fails', () => {
    useAuthorsMock.mockReturnValue({ data: undefined, isLoading: false, error: new Error('boom') });
    render(<AuthorList lang="en" />);

    expect(screen.getByText(/Error loading authors: boom/)).toBeTruthy();
    expect(screen.getByPlaceholderText(/Search authors/i)).toBeTruthy();
  });

  // Отбор делает сервер: показывается его выдача как есть. Прежний клиентский фильтр
  // поверх неё спрятал бы автора, у которого терма нет в английском имени.
  it('renders what the server returned without filtering it again', () => {
    useAuthorsMock.mockReturnValue({
      data: {
        items: [
          {
            id: 'a1',
            slug: 'lev-tolstoj',
            translations: [{ language: 'en', name: 'Leo Tolstoy', slug: 'leo-tolstoy' }],
          },
        ],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      },
      isLoading: false,
      error: null,
    });
    render(<AuthorList lang="en" />);
    typeSearch('tolstoj');
    act(() => vi.advanceTimersByTime(500));

    expect(screen.getByText('Leo Tolstoy')).toBeTruthy();
  });

  it('says nothing matched the term instead of offering to create the first author', () => {
    render(<AuthorList lang="en" />);
    typeSearch('zzz');
    act(() => vi.advanceTimersByTime(500));

    expect(screen.getByText(/Nothing matches "zzz"/)).toBeTruthy();
    expect(screen.queryByText(/Create a new author to get started/)).toBeNull();
  });

  // Возврат к прежнему терму начинается с первой страницы, а не с той, где его оставили.
  it('does not bring back the old page when the previous term returns', () => {
    useAuthorsMock.mockReturnValue(page(60, 3));
    render(<AuthorList lang="en" />);
    fireEvent.click(screen.getByRole('button', { name: '3' }));

    typeSearch('abc');
    act(() => vi.advanceTimersByTime(500));
    typeSearch('');
    act(() => vi.advanceTimersByTime(500));

    expect(useAuthorsMock).toHaveBeenLastCalledWith({ page: 1, limit: 20, search: undefined });
  });
});
