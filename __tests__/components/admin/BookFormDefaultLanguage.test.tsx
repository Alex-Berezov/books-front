import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BookForm } from '@/components/admin/books/BookForm/BookForm';

/**
 * Язык новой версии по умолчанию.
 *
 * Кнопка «+» стоит в переключателе версий, то есть форма создания открывается ровно там, где
 * версия текущего языка уже есть. Пока умолчанием был язык админки, поле «Language» показывало
 * занятый язык (в списке его нет, antd рисует такое значение сырой строкой), а сохранение
 * упиралось в 400 «Version for this language already exists for this book» — каждый раз.
 */

vi.mock('@/api/hooks/useAuthors', () => ({
  useAuthors: () => ({ data: { data: [] } }),
  useAuthor: () => ({ data: undefined }),
}));

vi.mock('@/api/hooks/useCategories', () => ({
  useCategories: () => ({ data: { data: [] } }),
}));

vi.mock('@/api/hooks/useBooks', () => ({
  useThemes: () => ({ data: [] }),
}));

vi.mock('@/components/common/RichTextEditor', () => ({
  RichTextEditor: () => <textarea data-testid="rich-text" />,
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

const withQueryClient = (ui: ReactNode) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
};

/**
 * Выбранное значение читается по видимой подписи: поле рисует antd, и `value` у него живёт
 * не на элементе, а в собственной разметке. Именно эту подпись и видит редактор.
 */
const selectedLanguage = () => {
  const field = screen.getByLabelText('Language *').closest('div');
  return field?.querySelector('.ant-select-selection-item')?.textContent ?? null;
};

describe('BookForm — язык новой версии по умолчанию', () => {
  it('не подставляет язык, у которого версия уже есть', () => {
    withQueryClient(<BookForm lang="en" existingLanguages={['en']} onSubmit={vi.fn()} />);

    expect(selectedLanguage()).not.toBe('EN');
  });

  it('берёт первый свободный язык', () => {
    withQueryClient(<BookForm lang="en" existingLanguages={['en', 'es']} onSubmit={vi.fn()} />);

    expect(selectedLanguage()).toBe('FR');
  });

  it('без занятых языков остаётся язык админки', () => {
    withQueryClient(<BookForm lang="es" existingLanguages={[]} onSubmit={vi.fn()} />);

    expect(selectedLanguage()).toBe('ES');
  });
});
