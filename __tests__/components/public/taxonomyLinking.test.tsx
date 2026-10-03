import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { TaxonomyCardGrid } from '@/components/public/taxonomy-overview/TaxonomyCardGrid';
import type { CategoryTree, TagListItem } from '@/types/api-schema';

type TermShape = {
  booksCount?: number;
  autoIndexable?: boolean;
  isVisible?: boolean;
  indexable?: boolean;
};

const makeCategory = (term: TermShape): CategoryTree =>
  ({
    id: 'c1',
    key: 'poetry',
    slug: 'poetry',
    name: 'Poetry',
    type: 'category',
    language: 'en',
    parentId: null,
    translations: [{ language: 'en', name: 'Poetry', slug: 'poetry' }],
    children: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...term,
  }) as CategoryTree;

const renderCardGrid = (term: TermShape) =>
  render(
    <TaxonomyCardGrid
      lang="en"
      items={[makeCategory(term)]}
      routeBase="category"
      emptyText="Nothing here"
      itemKind="category"
      bookForms={{ one: 'book', few: 'books', many: 'books' }}
    />
  );

/**
 * Every renderer below must agree with `isTaxonomyLinkable`: a term that answers
 * noindex gets no internal link, whatever its raw book count says.
 *
 * The list held `TaxonomyTree` and `TaxonomyGroupedList` until 11.08.2026, when
 * both were deleted as dead (`LEGACY-051`). This test was their only caller —
 * which is exactly what made them look alive in a usage search. A renderer
 * belongs here when a page renders it; add the next one together with its page.
 */
const RENDERERS: Array<{ name: string; render: (term: TermShape) => void }> = [
  { name: 'TaxonomyCardGrid', render: (term) => void renderCardGrid(term) },
];

describe.each(RENDERERS)('$name link filtering', ({ render: renderComponent }) => {
  it('hides a term closed by hysteresis despite having books', () => {
    renderComponent({ booksCount: 2, autoIndexable: false });
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('shows a term the backend keeps open below the naive threshold', () => {
    renderComponent({ booksCount: 2, autoIndexable: true });
    expect(screen.getByRole('link', { name: 'Poetry' })).toHaveAttribute(
      'href',
      expect.stringContaining('/poetry')
    );
  });

  it('falls back to "has any books" when autoIndexable is absent', () => {
    renderComponent({ booksCount: 5 });
    expect(screen.getByRole('link', { name: 'Poetry' })).toBeInTheDocument();
  });

  it('hides an empty term when autoIndexable is absent', () => {
    renderComponent({ booksCount: 0 });
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('hides a hidden term even when it is auto-indexable', () => {
    renderComponent({ booksCount: 9, autoIndexable: true, isVisible: false });
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('hides an editorially non-indexable term even when it is auto-indexable', () => {
    renderComponent({ booksCount: 9, autoIndexable: true, indexable: false });
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});

describe('TaxonomyCardGrid child terms', () => {
  it('drops a non-indexable child while keeping the linkable parent', () => {
    const parent = makeCategory({ booksCount: 9, autoIndexable: true });
    const child = {
      ...makeCategory({ booksCount: 2, autoIndexable: false }),
      id: 'c2',
      slug: 'sonnets',
      name: 'Sonnets',
      parentId: 'c1',
    } as CategoryTree;

    render(
      <TaxonomyCardGrid
        lang="en"
        items={[{ ...parent, children: [child] }]}
        routeBase="category"
        emptyText="Nothing here"
        itemKind="category"
        bookForms={{ one: 'book', few: 'books', many: 'books' }}
      />
    );

    expect(screen.getByRole('link', { name: 'Poetry' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Sonnets' })).not.toBeInTheDocument();
  });
});

// `LEGACY-422`, `T90` (решение арбитра 03.10.2026): дерево с `?lang` отдаёт флаг категории
// несвёрнутым, а `noindex` поля Robots — в `translations[].indexable`; обзор решает по обоим.
describe('TaxonomyCardGrid translation closed by the Robots field', () => {
  const grid = (items: CategoryTree[]) =>
    render(
      <TaxonomyCardGrid
        lang="en"
        items={items}
        routeBase="category"
        emptyText="Nothing here"
        itemKind="category"
        bookForms={{ one: 'book', few: 'books', many: 'books' }}
      />
    );

  it('drops a term whose translation on this language is closed', () => {
    const term = {
      ...makeCategory({ booksCount: 9, autoIndexable: true, indexable: true }),
      translations: [{ language: 'en', name: 'Poetry', slug: 'poetry', indexable: false }],
    } as CategoryTree;

    grid([term]);

    expect(screen.queryByRole('link', { name: 'Poetry' })).not.toBeInTheDocument();
    expect(screen.getByText('Nothing here')).toBeInTheDocument();
  });

  it('keeps a term whose translation is closed only on another language', () => {
    const term = {
      ...makeCategory({ booksCount: 9, autoIndexable: true, indexable: true }),
      translations: [
        { language: 'en', name: 'Poetry', slug: 'poetry', indexable: true },
        { language: 'ru', name: 'Поэзия', slug: 'poeziya', indexable: false },
      ],
    } as CategoryTree;

    grid([term]);

    expect(screen.getByRole('link', { name: 'Poetry' })).toBeInTheDocument();
  });

  it('drops a tag whose translation on this language is closed', () => {
    const tag = {
      id: 't1',
      key: 'love',
      name: 'Love',
      slug: 'love',
      booksCount: 9,
      autoIndexable: true,
      indexable: true,
      translations: [{ language: 'en', name: 'Love', slug: 'love', indexable: false }],
    } as TagListItem;

    render(
      <TaxonomyCardGrid
        lang="en"
        items={[tag]}
        routeBase="tag"
        emptyText="Nothing here"
        itemKind="tag"
        bookForms={{ one: 'book', few: 'books', many: 'books' }}
      />
    );

    expect(screen.queryByRole('link', { name: 'Love' })).not.toBeInTheDocument();
  });

  it('drops a closed child while keeping the open parent', () => {
    const parent = makeCategory({ booksCount: 9, autoIndexable: true });
    const child = {
      ...makeCategory({ booksCount: 9, autoIndexable: true }),
      id: 'c2',
      slug: 'sonnets',
      name: 'Sonnets',
      parentId: 'c1',
      translations: [{ language: 'en', name: 'Sonnets', slug: 'sonnets', indexable: false }],
    } as CategoryTree;

    grid([{ ...parent, children: [child] }]);

    expect(screen.getByRole('link', { name: 'Poetry' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Sonnets' })).not.toBeInTheDocument();
  });
});
