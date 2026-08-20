import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BookForm } from '@/components/admin/books/BookForm/BookForm';
import type { BookVersionDetail } from '@/types/api-schema';

/**
 * Отправка формы версии книги отменялась молча: невалидное поле без видимой подписи
 * (элемент массива, поле ниже по странице) не давало запросу уйти, и кнопка «Update Version»
 * выглядела нажатой впустую — ни запроса, ни ошибки.
 */

vi.mock('@/api/hooks/useAuthors', () => ({
  useAuthors: () => ({ data: { data: [] } }),
}));

vi.mock('@/api/hooks/useCategories', () => ({
  useCategories: () => ({ data: { data: [] } }),
}));

vi.mock('@/api/hooks/useBooks', () => ({
  useThemes: () => ({ data: [] }),
}));

vi.mock('@/components/common/RichTextEditor', () => ({
  RichTextEditor: ({ value, onChange }: { value: string; onChange: (html: string) => void }) => (
    <textarea
      data-testid="rich-text"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  ),
}));

vi.mock('@/lib/hooks/useSlugValidation', () => ({
  useSlugValidation: () => ({
    status: 'idle',
    isUnique: undefined,
    suggestedSlug: undefined,
    existingItem: undefined,
    reserved: undefined,
    validate: vi.fn(),
  }),
}));

const version = (overrides: Record<string, unknown> = {}): BookVersionDetail =>
  ({
    id: 'version-1',
    bookId: 'book-1',
    bookSlug: 'bratya-karamazovy',
    language: 'ru',
    title: 'Братья Карамазовы',
    author: 'Фёдор Достоевский',
    description: 'Роман',
    coverImageUrl: 'https://cdn.example.com/cover.jpg',
    type: 'text',
    isFree: true,
    status: 'draft',
    ...overrides,
  }) as unknown as BookVersionDetail;

const submitButton = () => screen.getByRole('button', { name: /update version/i });

const withQueryClient = (ui: ReactNode) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
};

describe('BookForm — a rejected submit never stays silent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('names the invalid field that has no error message of its own', async () => {
    const onSubmit = vi.fn();
    // У цитаты нет обязательного `text`: своей подписи об ошибке у поля нет.
    withQueryClient(
      <BookForm
        lang="ru"
        initialData={version({ quotes: [{ author: 'Иван' }] })}
        onSubmit={onSubmit}
      />
    );

    fireEvent.click(submitButton());

    const summary = await screen.findByRole('alert');
    expect(summary).toHaveTextContent(/the form was not saved/i);
    expect(within(summary).getByText('Quotes')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('names a required field the editor left empty', async () => {
    const onSubmit = vi.fn();
    withQueryClient(
      <BookForm lang="ru" initialData={version({ coverImageUrl: '' })} onSubmit={onSubmit} />
    );

    fireEvent.click(submitButton());

    const summary = await screen.findByRole('alert');
    expect(summary).toHaveTextContent(/the form was not saved/i);
    expect(within(summary).getByText('Cover image URL')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits and shows no summary when the data is valid', async () => {
    const onSubmit = vi.fn();
    withQueryClient(<BookForm lang="ru" initialData={version()} onSubmit={onSubmit} />);

    fireEvent.click(submitButton());

    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(screen.queryByText(/the form was not saved/i)).not.toBeInTheDocument();
  });
});
