import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { BookTaxonomyChips } from '@/app/[lang]/book/[slug]/BookTaxonomyChips';
import type { BookTaxonomyTerm } from '@/app/[lang]/book/[slug]/BookTaxonomyChips';

const poetry = (overrides: Partial<BookTaxonomyTerm> = {}): BookTaxonomyTerm => ({
  id: 'c1',
  name: 'Poetry',
  slug: 'poetry',
  type: 'genre',
  booksCount: 6,
  translations: [{ language: 'en', name: 'Poetry', slug: 'poetry', autoIndexable: true }],
  ...overrides,
});

describe('BookTaxonomyChips', () => {
  it('keeps a non-indexable category visible as text but without a link', () => {
    render(
      <BookTaxonomyChips
        lang="en"
        variant="categories"
        terms={[
          poetry({
            booksCount: 2,
            translations: [
              { language: 'en', name: 'Poetry', slug: 'poetry', autoIndexable: false },
            ],
          }),
        ]}
      />
    );

    expect(screen.getByText('Poetry')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('drops the link when the term has no books, whatever the cache claims', () => {
    render(
      <BookTaxonomyChips lang="en" variant="categories" terms={[poetry({ booksCount: 0 })]} />
    );

    expect(screen.getByText('Poetry')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('links an indexable genre to its genre route', () => {
    render(<BookTaxonomyChips lang="en" variant="categories" terms={[poetry()]} />);

    expect(screen.getByRole('link', { name: 'Poetry' })).toHaveAttribute(
      'href',
      '/en/genre/poetry'
    );
  });

  it('links a plain category to its category route', () => {
    render(
      <BookTaxonomyChips lang="en" variant="categories" terms={[poetry({ type: 'category' })]} />
    );

    expect(screen.getByRole('link', { name: 'Poetry' })).toHaveAttribute(
      'href',
      '/en/category/poetry'
    );
  });

  it('does not borrow indexability from another language', () => {
    render(
      <BookTaxonomyChips
        lang="ru"
        variant="categories"
        terms={[
          poetry({
            translations: [{ language: 'en', name: 'Poetry', slug: 'poetry', autoIndexable: true }],
          }),
        ]}
      />
    );

    expect(screen.getByText('Poetry')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('links tags through the tag route and honours the editorial switch', () => {
    render(
      <BookTaxonomyChips
        lang="en"
        variant="tags"
        terms={[
          {
            id: 't1',
            name: 'Adventure',
            slug: 'adventure',
            booksCount: 4,
            translations: [
              { language: 'en', name: 'Adventure', slug: 'adventure', autoIndexable: true },
            ],
          },
          {
            id: 't2',
            name: 'Hidden',
            slug: 'hidden',
            booksCount: 4,
            isVisible: false,
            translations: [{ language: 'en', name: 'Hidden', slug: 'hidden', autoIndexable: true }],
          },
        ]}
      />
    );

    expect(screen.getByRole('link', { name: 'Adventure' })).toHaveAttribute(
      'href',
      '/en/tag/adventure'
    );
    expect(screen.getByText('Hidden')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Hidden' })).not.toBeInTheDocument();
  });

  it('renders nothing when the book has no terms', () => {
    const { container } = render(<BookTaxonomyChips lang="en" variant="tags" terms={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
