import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SlugInput } from '@/components/common/SlugInput/SlugInput';

const hookResult = {
  existingItem: null as unknown,
  isUnique: true as boolean | undefined,
  reserved: undefined as boolean | undefined,
  status: 'idle',
  suggestedSlug: undefined as string | undefined,
  validate: vi.fn(),
};

vi.mock('@/lib/hooks/useSlugValidation', () => ({
  useSlugValidation: () => hookResult,
}));

/**
 * A slug matching a route is the quietest way to lose a page: it saves, it lists
 * correctly in the admin, and it simply never opens, because App Router answers
 * the static segment before the catch-all. These tests hold the warning in place.
 */
describe('SlugInput — slugs the router already owns', () => {
  beforeEach(() => {
    hookResult.existingItem = null;
    hookResult.isUnique = true;
    hookResult.reserved = undefined;
    hookResult.status = 'idle';
    hookResult.suggestedSlug = undefined;
  });

  it('warns about a reserved page slug without waiting for the API', () => {
    // The API client fails open on error, so a page relying on the response alone
    // would stay silent exactly when the check did not happen.
    render(
      <SlugInput entityType="page" lang="en" mode="create" onChange={vi.fn()} value="catalog" />
    );

    expect(screen.getByText(/reserved by a site route/i)).toBeInTheDocument();
  });

  it('warns when only the API knows the slug is reserved', () => {
    hookResult.reserved = true;
    hookResult.isUnique = false;
    // A slug this build does not route yet, but the backend does reserve.
    render(
      <SlugInput entityType="page" lang="en" mode="create" onChange={vi.fn()} value="newsroom" />
    );

    expect(screen.getByText(/reserved by a site route/i)).toBeInTheDocument();
  });

  it('stays quiet for an ordinary page slug', () => {
    render(
      <SlugInput entityType="page" lang="en" mode="create" onChange={vi.fn()} value="about-us" />
    );

    expect(screen.queryByText(/reserved by a site route/i)).not.toBeInTheDocument();
  });

  it('does not warn for a book — its slug lives under a prefix', () => {
    // `/en/book/catalog` collides with nothing, and the backend reserves page
    // slugs only. Warning more widely than the rule enforces would block a
    // legitimate title.
    render(<SlugInput entityType="book" mode="create" onChange={vi.fn()} value="catalog" />);

    expect(screen.queryByText(/reserved by a site route/i)).not.toBeInTheDocument();
  });

  it('does not flag a page against its own grandfathered slug', () => {
    // The backend lets a page created before the rule keep its slug, and
    // check-slug answers `reserved: false` once it knows which page is asking.
    // A local check blind to that would warn the owner about a slug the API
    // accepts, with no way to dismiss it.
    render(
      <SlugInput
        entityType="page"
        excludeId="page-1"
        lang="en"
        mode="edit"
        onChange={vi.fn()}
        value="catalog"
      />
    );

    expect(screen.queryByText(/reserved by a site route/i)).not.toBeInTheDocument();
  });

  it('still warns in edit mode when the API says the slug is reserved', () => {
    // Renaming an existing page *into* a reserved slug stays refused; there the
    // API reports it, because the slug is not the page's own.
    hookResult.reserved = true;
    hookResult.isUnique = false;
    render(
      <SlugInput
        entityType="page"
        excludeId="page-1"
        lang="en"
        mode="edit"
        onChange={vi.fn()}
        value="privacy"
      />
    );

    expect(screen.getByText(/reserved by a site route/i)).toBeInTheDocument();
  });

  it('offers the suggested slug when the API supplies one', () => {
    hookResult.reserved = true;
    hookResult.isUnique = false;
    hookResult.suggestedSlug = 'catalog-2';
    render(
      <SlugInput entityType="page" lang="en" mode="create" onChange={vi.fn()} value="catalog" />
    );

    expect(screen.getByText('catalog-2')).toBeInTheDocument();
  });
});
