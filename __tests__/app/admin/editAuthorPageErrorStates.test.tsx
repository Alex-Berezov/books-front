import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import EditAuthorPage from '@/app/admin/[lang]/authors/[id]/edit/page';
import { ApiError } from '@/types/api';
import type { Author } from '@/types/api-schema';

/**
 * `LEGACY-352`: страница правки автора раньше искала запись в первой странице
 * общего списка и одной веткой `!author` отвечала и за «автора правда нет»,
 * и за отказ запроса (401/403/500) — оба случая показывали «could not be
 * found or has been deleted» на живой записи. Теперь страница читает
 * `GET /admin/authors/:id` через `useAuthor` и разводит состояния по коду
 * отказа `ApiError`, а не гадает по пустому результату поиска.
 */

const mocks = vi.hoisted(() => ({
  useAuthor: vi.fn(),
}));

vi.mock('@/api/hooks/useAuthors', () => ({
  useAuthor: mocks.useAuthor,
}));

vi.mock('@/components/admin/authors/AuthorForm/AuthorForm', () => ({
  AuthorForm: ({ author }: { author?: Author | null }) => (
    <div data-testid="author-form">{author?.slug}</div>
  ),
}));

const makeAuthor = (overrides: Partial<Author> = {}): Author => ({
  id: 'author-1',
  slug: 'jane-doe',
  translations: [{ language: 'en', slug: 'jane-doe', name: 'Jane Doe' }],
  ...overrides,
});

describe('EditAuthorPage: отказ запроса не выглядит как удалённая запись', () => {
  it('показывает скелет, пока запрос не завершился', () => {
    mocks.useAuthor.mockReturnValue({ data: undefined, isLoading: true, error: null });

    render(<EditAuthorPage params={{ lang: 'en', id: 'author-1' }} />);

    expect(screen.queryByText('Author Not Found')).toBeNull();
    expect(screen.queryByTestId('author-form')).toBeNull();
  });

  it('404 — «Author Not Found», автора правда нет', () => {
    mocks.useAuthor.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new ApiError({ message: "Author with ID 'author-1' not found", statusCode: 404 }),
    });

    render(<EditAuthorPage params={{ lang: 'en', id: 'author-1' }} />);

    expect(screen.getByText('Author Not Found')).toBeInTheDocument();
    expect(screen.queryByTestId('author-form')).toBeNull();
  });

  it('500 — «Failed to Load Author», а не «Not Found» на живой записи', () => {
    mocks.useAuthor.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new ApiError({ message: 'Internal server error', statusCode: 500 }),
    });

    render(<EditAuthorPage params={{ lang: 'en', id: 'author-1' }} />);

    expect(screen.getByText('Failed to Load Author')).toBeInTheDocument();
    expect(screen.queryByText('Author Not Found')).toBeNull();
  });

  it('401 — тоже «Failed to Load Author», протухшая сессия не читается как удаление', () => {
    mocks.useAuthor.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new ApiError({ message: 'Unauthorized', statusCode: 401 }),
    });

    render(<EditAuthorPage params={{ lang: 'en', id: 'author-1' }} />);

    expect(screen.getByText('Failed to Load Author')).toBeInTheDocument();
  });

  // `refetchOnReconnect` перезапрашивает автора после моргнувшей связи. Упавший
  // повтор при живых данных не имеет права размонтировать форму — вместе с ней
  // потерялось бы всё, что редактор успел набрать, и назад оно не вернётся.
  it('отказ поверх уже загруженных данных оставляет форму и предупреждает', () => {
    mocks.useAuthor.mockReturnValue({
      data: makeAuthor(),
      isLoading: false,
      error: new ApiError({ message: 'Internal server error', statusCode: 500 }),
    });

    render(<EditAuthorPage params={{ lang: 'en', id: 'author-1' }} />);

    expect(screen.getByTestId('author-form')).toHaveTextContent('jane-doe');
    expect(screen.queryByText('Failed to Load Author')).toBeNull();
    expect(screen.getByText(/Could not refresh this author/)).toBeInTheDocument();
  });

  it('успех — форма получает автора, ошибок нет', () => {
    mocks.useAuthor.mockReturnValue({
      data: makeAuthor(),
      isLoading: false,
      error: null,
    });

    render(<EditAuthorPage params={{ lang: 'en', id: 'author-1' }} />);

    expect(screen.getByTestId('author-form')).toHaveTextContent('jane-doe');
    expect(screen.queryByText('Author Not Found')).toBeNull();
    expect(screen.queryByText('Failed to Load Author')).toBeNull();
    expect(screen.queryByText(/Could not refresh this author/)).toBeNull();
  });
});
