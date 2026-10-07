import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BookForm } from '@/components/admin/books/BookForm/BookForm';
import { SLUG_MAX_LENGTH } from '@/lib/utils/slug';
import type { UseSlugValidationParams } from '@/lib/hooks/useSlugValidation';
import type { BookVersionDetail } from '@/types/api-schema';

/**
 * Поле слага в форме версии проверяет слаг версии, а не книги: язык формы, сама версия
 * и её книга уходят в проверку. Вернёшь `entityType="book"` или потеряешь язык - форма снова
 * сверяет слаг с `Book.slug`, ради чего и была эта правка.
 */

const mocks = vi.hoisted(() => ({ params: [] as UseSlugValidationParams[], validate: vi.fn() }));

vi.mock('@/api/hooks/useAuthors', () => ({
  useAuthors: () => ({
    data: { items: [], pagination: { page: 1, limit: 0, total: 0, totalPages: 0 } },
  }),
  useAuthor: () => ({ data: undefined }),
}));

vi.mock('@/api/hooks/useCategories', () => ({
  useCategories: () => ({ data: [] }),
}));

vi.mock('@/api/hooks/useBooks', () => ({
  useThemes: () => ({
    data: { items: [], pagination: { page: 1, limit: 0, total: 0, totalPages: 0 } },
  }),
}));

vi.mock('@/components/common/RichTextEditor', () => ({
  RichTextEditor: () => <textarea data-testid="rich-text" />,
}));

vi.mock('@/lib/hooks/useSlugValidation', () => ({
  useSlugValidation: (params: UseSlugValidationParams) => {
    mocks.params.push(params);
    return {
      status: 'idle',
      isUnique: undefined,
      suggestedSlug: undefined,
      existingItem: undefined,
      reserved: undefined,
      validate: mocks.validate,
    };
  },
}));

const withQueryClient = (ui: ReactNode) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
};

const lastParams = () => mocks.params[mocks.params.length - 1];

describe('BookForm - проверка слага языковой версии', () => {
  beforeEach(() => {
    mocks.params = [];
    mocks.validate.mockClear();
  });

  it('форма создания проверяет слаг версии в своём языке и знает свою книгу', () => {
    withQueryClient(
      <BookForm bookId="book-1" lang="en" existingLanguages={['en']} onSubmit={vi.fn()} />
    );

    expect(lastParams()).toMatchObject({
      entityType: 'bookVersion',
      lang: 'es',
      ownBookId: 'book-1',
    });
    expect(lastParams().excludeId).toBeUndefined();
  });

  it('форма правки исключает саму версию', () => {
    const version = {
      id: 'version-1',
      bookId: 'book-1',
      bookSlug: 'the-brothers-karamazov',
      slug: 'bratya-karamazovy',
      language: 'ru',
      title: 'Братья Карамазовы',
      author: 'Фёдор Достоевский',
      type: 'text',
      isFree: true,
      status: 'draft',
    } as BookVersionDetail;

    withQueryClient(<BookForm initialData={version} lang="ru" onSubmit={vi.fn()} />);

    expect(lastParams()).toMatchObject({
      entityType: 'bookVersion',
      lang: 'ru',
      excludeId: 'version-1',
      ownBookId: 'book-1',
    });
  });

  // LEGACY-437: `check-slug` отвечает 400 на слаг длиннее предела; хранимый слаг версии не проверяется.
  it('форма правки не проверяет хранимый слаг длиннее предела', () => {
    const longSlug = 'a'.repeat(SLUG_MAX_LENGTH + 1);
    const version = {
      id: 'version-1',
      bookId: 'book-1',
      bookSlug: 'the-brothers-karamazov',
      slug: longSlug,
      language: 'ru',
      title: 'Братья Карамазовы',
      author: 'Фёдор Достоевский',
      type: 'text',
      isFree: true,
      status: 'draft',
    } as BookVersionDetail;

    withQueryClient(<BookForm initialData={version} lang="ru" onSubmit={vi.fn()} />);

    expect(mocks.validate).not.toHaveBeenCalledWith(longSlug);
  });
});
