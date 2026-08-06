import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TaxonomyOverview } from '@/components/public/taxonomy-overview/TaxonomyOverview';
import type { CategoryTree, PageResponse } from '@/types/api-schema';

// Leaf client components. They are not what this test is about, and one of them
// reaches for the router.
vi.mock('@/components/public/navigation', () => ({
  PageBackButton: () => null,
}));
vi.mock('@/components/public/Breadcrumbs', () => ({
  Breadcrumbs: () => null,
}));

const term = (over: Partial<CategoryTree> & { slug: string; name: string }): CategoryTree =>
  ({
    id: over.slug,
    key: over.slug,
    type: 'genre',
    language: 'en',
    parentId: null,
    booksCount: 7,
    autoIndexable: true,
    isVisible: true,
    indexable: true,
    translations: [{ language: 'en', name: over.name, slug: over.slug }],
    children: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...over,
  }) as CategoryTree;

/**
 * Rule 7.6 — everything advertised in the sitemap must be reachable without
 * executing JavaScript.
 *
 * The hubs used to fetch their terms from the browser, so the server HTML of
 * `/:lang/genres` contained no link to any genre at all: 25 sitemap URLs were
 * advertised and unreachable to a crawler that does not run JS. This component
 * therefore must render its links from props alone — no hooks, no fetching.
 */
describe('TaxonomyOverview renders taxonomy links without JavaScript', () => {
  it('links every linkable term straight from its props', () => {
    render(
      <TaxonomyOverview
        configKey="genre"
        items={[term({ slug: 'poetry', name: 'Poetry' }), term({ slug: 'drama', name: 'Drama' })]}
        lang="en"
        page={null}
      />
    );

    expect(screen.getByRole('link', { name: 'Poetry' })).toHaveAttribute(
      'href',
      '/en/genre/poetry'
    );
    expect(screen.getByRole('link', { name: 'Drama' })).toHaveAttribute('href', '/en/genre/drama');
  });

  it('keeps the emptiness rule: a non-linkable term produces no link', () => {
    render(
      <TaxonomyOverview
        configKey="genre"
        items={[term({ slug: 'empty', name: 'Empty', booksCount: 0, autoIndexable: false })]}
        lang="en"
        page={null}
      />
    );

    expect(screen.queryByRole('link', { name: 'Empty' })).toBeNull();
  });

  it('uses the editorial page for H1 when there is one, and the dictionary when there is not', () => {
    const { rerender } = render(
      <TaxonomyOverview configKey="genre" items={[]} lang="en" page={null} />
    );
    const fallbackHeading = screen.getByRole('heading', { level: 1 }).textContent;

    const editorial = { h1: 'Browse Book Genres' } as unknown as PageResponse;
    rerender(<TaxonomyOverview configKey="genre" items={[]} lang="en" page={editorial} />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Browse Book Genres');
    expect(fallbackHeading).toBeTruthy();
    expect(fallbackHeading).not.toBe('genres.title');
  });
});
