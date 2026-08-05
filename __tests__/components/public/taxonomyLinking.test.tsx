import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { TaxonomyCardGrid } from '@/components/public/taxonomy-overview/TaxonomyCardGrid';
import { TaxonomyGroupedList } from '@/components/public/taxonomy-overview/TaxonomyGroupedList';
import { TaxonomyTree } from '@/components/public/taxonomy-overview/TaxonomyTree';
import type { CategoryTree } from '@/types/api-schema';

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
      bookSingular="book"
      bookPlural="books"
    />
  );

/**
 * Every renderer below must agree with `isTaxonomyLinkable`: a term that answers
 * noindex gets no internal link, whatever its raw book count says.
 */
const RENDERERS: Array<{ name: string; render: (term: TermShape) => void }> = [
  { name: 'TaxonomyCardGrid', render: (term) => void renderCardGrid(term) },
  {
    name: 'TaxonomyTree',
    render: (term) => void render(<TaxonomyTree lang="en" items={[makeCategory(term)]} />),
  },
  {
    name: 'TaxonomyGroupedList',
    render: (term) => void render(<TaxonomyGroupedList lang="en" items={[makeCategory(term)]} />),
  },
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
        bookSingular="book"
        bookPlural="books"
      />
    );

    expect(screen.getByRole('link', { name: 'Poetry' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Sonnets' })).not.toBeInTheDocument();
  });
});
