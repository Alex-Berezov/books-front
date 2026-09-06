import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { StarRating } from '@/components/public/books/StarRating';
import { TaxonomyCardGrid } from '@/components/public/taxonomy-overview/TaxonomyCardGrid';
import ru from '@/lib/i18n/locales/ru.json';
import type { CategoryTree } from '@/types/api-schema';

vi.mock('next/navigation', () => ({
  usePathname: () => '/ru/genre',
}));

const makeCategory = (booksCount: number): CategoryTree =>
  ({
    id: 'c1',
    key: 'poetry',
    slug: 'poeziya',
    name: 'Poetry',
    type: 'category',
    language: 'ru',
    parentId: null,
    translations: [{ language: 'ru', name: 'Поэзия', slug: 'poeziya' }],
    children: [],
    booksCount,
    autoIndexable: true,
    isVisible: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }) as CategoryTree;

const bookForms = {
  one: ru.common.bookCountOne,
  few: ru.common.bookCountFew,
  many: ru.common.bookCountMany,
};

const renderGrid = (booksCount: number) =>
  render(
    <TaxonomyCardGrid
      lang="ru"
      items={[makeCategory(booksCount)]}
      routeBase="genre"
      emptyText="Пусто"
      itemKind="category"
      bookForms={bookForms}
    />
  );

/**
 * 🔴 Пара форм давала «2 книг» и «22 книг» на каждой карточке таксономии и
 * в подписи полки. Сторож ловит именно возврат к тернарнику `=== 1 ? one : many`:
 * на числах 2-4 он выдаёт форму `many`, а здесь ожидается `few`.
 */
describe('счётные подписи на русском', () => {
  it('карточка таксономии склоняет книги по трём формам', () => {
    renderGrid(1);
    expect(screen.getByText(`1 ${ru.common.bookCountOne}`)).toBeInTheDocument();

    renderGrid(2);
    expect(screen.getByText(`2 ${ru.common.bookCountFew}`)).toBeInTheDocument();

    renderGrid(5);
    expect(screen.getByText(`5 ${ru.common.bookCountMany}`)).toBeInTheDocument();

    // Одиннадцать — исключение: «11 книг», а не «11 книга».
    renderGrid(11);
    expect(screen.getByText(`11 ${ru.common.bookCountMany}`)).toBeInTheDocument();

    renderGrid(22);
    expect(screen.getByText(`22 ${ru.common.bookCountFew}`)).toBeInTheDocument();
  });

  it('подписи звёзд в оценке склоняются по тем же формам', () => {
    render(<StarRating rating={3} interactive />);

    expect(screen.getByText('1 звезда')).toBeInTheDocument();
    expect(screen.getByText('2 звезды')).toBeInTheDocument();
    expect(screen.getByText('5 звезд')).toBeInTheDocument();
  });
});
