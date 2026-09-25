import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TaxonomyDetailPage } from '@/components/public/taxonomy/TaxonomyDetailPage/TaxonomyDetailPage';
import type { Category, CategoryBookCardsResponse, CategoryListItem } from '@/types/api-schema';

vi.mock('next/navigation', () => ({
  usePathname: () => '/en/category/poetry',
  useRouter: () => ({ back: vi.fn(), push: vi.fn() }),
}));

// LEGACY-416. Боковая колонка берёт детей и соседей из `GET /:lang/categories`
// сравнением `parentId`; без поля в элементе списка оба блока пусты на каждой
// странице. Фикстуры объявлены реальным типом элемента списка, который страница
// передаёт в `allCategories`, — поле обязано быть в самом типе.
const item = (id: string, parentId: string | null, name: string): CategoryListItem => ({
  id,
  key: id,
  name,
  slug: id,
  type: 'category',
  parentId,
  booksCount: 7,
  isVisible: true,
  indexable: true,
  autoIndexable: true,
  translations: [{ language: 'en', name, slug: id, bookCount: 7, autoIndexable: true }],
});

const list: CategoryListItem[] = [
  item('fiction', null, 'Fiction'),
  item('poetry', 'fiction', 'Poetry'),
  item('drama', 'fiction', 'Drama'),
  item('sonnets', 'poetry', 'Sonnets'),
  item('science', null, 'Science'),
];

const data: CategoryBookCardsResponse = {
  category: { ...list[1], translation: list[1].translations[0] } as Category,
  items: [],
  pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
};

const labels = {
  breadcrumbHome: 'Home',
  breadcrumbLabel: 'Categories',
  currentSection: 'In this section',
  allLabel: 'All categories',
  allBooksLabel: 'All books',
  browseLabel: 'Browse',
  exploreMoreLabel: 'Explore more',
  allBooksLink: 'All books',
  tagsLink: 'Tags',
  linkLabel: 'Open',
  bookForms: { one: '{count} book', few: '{count} books', many: '{count} books' },
  relatedGenres: 'Genres',
  relatedCategories: 'Categories',
  relatedCollections: 'Collections',
  relatedTags: 'Tags',
  aboutSection: 'About',
  faqTitle: 'FAQ',
  showMore: 'More',
  showLess: 'Less',
  noBooks: 'No books',
  paginationLabel: 'Pages',
};

describe('TaxonomyDetailPage — sidebar hierarchy (LEGACY-416)', () => {
  it('renders children and siblings of a term with a known parent', () => {
    render(
      <TaxonomyDetailPage
        lang="en"
        slug="poetry"
        taxonomyType="category"
        data={data}
        allCategories={list}
        translations={labels}
        path="category"
        currentPage={1}
        totalPages={0}
        total={0}
      />
    );

    expect(screen.getAllByRole('link', { name: 'Sonnets' })[0]).toHaveAttribute(
      'href',
      '/en/category/sonnets'
    );
    expect(screen.getAllByRole('link', { name: 'Drama' })[0]).toHaveAttribute(
      'href',
      '/en/category/drama'
    );
  });
});
