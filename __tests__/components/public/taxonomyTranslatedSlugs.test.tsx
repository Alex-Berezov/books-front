import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { BookTaxonomyChips } from '@/app/[lang]/book/[slug]/BookTaxonomyChips';
import { TaxonomyCardGrid } from '@/components/public/taxonomy-overview/TaxonomyCardGrid';
import { isUnaddressableInLanguage, resolveTaxonomyDestination } from '@/lib/seo/taxonomy-slug';
import type { Category, CategoryTree } from '@/types/api-schema';

type Translation = { language: string; name: string; slug: string; autoIndexable?: boolean };

const term = (translations: Translation[], overrides: Partial<CategoryTree> = {}): CategoryTree =>
  ({
    id: 'c1',
    key: 'historical-fiction',
    // The base slug is English; a localized page must never link to it.
    slug: 'historical-fiction',
    name: 'Historical Fiction',
    type: 'genre',
    language: 'en',
    parentId: null,
    booksCount: 6,
    translations,
    children: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }) as CategoryTree;

const renderGrid = (lang: 'en' | 'ru', items: CategoryTree[]) =>
  render(
    <TaxonomyCardGrid
      lang={lang}
      items={items}
      routeBase="genre"
      emptyText="Nothing here"
      itemKind="category"
      bookSingular="book"
      bookPlural="books"
    />
  );

const RU = {
  language: 'ru',
  name: 'Историческая проза',
  slug: 'istoricheskaya-proza',
  autoIndexable: true,
};
const EN = {
  language: 'en',
  name: 'Historical Fiction',
  slug: 'historical-fiction',
  autoIndexable: true,
};

describe('TaxonomyCardGrid — translated slugs', () => {
  it('links to the slug of the rendered language, not the base one', () => {
    renderGrid('ru', [term([EN, RU])]);

    expect(screen.getByRole('link', { name: 'Историческая проза' })).toHaveAttribute(
      'href',
      '/ru/genre/istoricheskaya-proza'
    );
  });

  it('drops a term with no translation into the rendered language', () => {
    renderGrid('ru', [term([EN])]);

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    // Nor as text: an English name under a Russian heading is not a useful card.
    expect(screen.queryByText('Historical Fiction')).not.toBeInTheDocument();
    expect(screen.getByText('Nothing here')).toBeInTheDocument();
  });

  it('drops an untranslated child while keeping the translated parent', () => {
    const child = term([EN], {
      id: 'c2',
      slug: 'gothic-fiction',
      name: 'Gothic Fiction',
      parentId: 'c1',
    });
    const translatedChild = term([EN, { ...RU, name: 'Готика', slug: 'gotika' }], {
      id: 'c3',
      parentId: 'c1',
    });

    renderGrid('ru', [term([EN, RU], { children: [child, translatedChild] })]);

    expect(screen.getByRole('link', { name: 'Историческая проза' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Готика' })).toHaveAttribute(
      'href',
      '/ru/genre/gotika'
    );
    expect(screen.queryByText('Gothic Fiction')).not.toBeInTheDocument();
  });

  it('shows the child name in the rendered language, not the base name', () => {
    const child = term([EN, { ...RU, name: 'Готика', slug: 'gotika' }], {
      id: 'c3',
      name: 'Gothic Fiction',
      parentId: 'c1',
    });

    renderGrid('ru', [term([EN, RU], { children: [child] })]);

    expect(screen.getByRole('link', { name: 'Готика' })).toBeInTheDocument();
  });
});

describe('BookTaxonomyChips — route segment and translated slug', () => {
  it('routes a collection to /collection/, not /category/', () => {
    render(
      <BookTaxonomyChips
        lang="en"
        variant="categories"
        terms={[
          {
            id: 'c9',
            name: 'Free Books',
            slug: 'free-books',
            type: 'collection',
            booksCount: 8,
            translations: [
              { language: 'en', name: 'Free Books', slug: 'free-books', autoIndexable: true },
            ],
          },
        ]}
      />
    );

    expect(screen.getByRole('link', { name: 'Free Books' })).toHaveAttribute(
      'href',
      '/en/collection/free-books'
    );
  });

  it('keeps an untranslated term as text and never links its foreign slug', () => {
    render(
      <BookTaxonomyChips
        lang="ru"
        variant="categories"
        terms={[
          {
            id: 'c1',
            name: 'Historical Fiction',
            slug: 'historical-fiction',
            type: 'genre',
            booksCount: 6,
            translations: [EN],
          },
        ]}
      />
    );

    expect(screen.getByText('Historical Fiction')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});

describe('resolveTaxonomyDestination', () => {
  const category = (
    translationSlug: string | null,
    type: 'genre' | 'category' | 'collection' = 'genre'
  ) =>
    ({
      id: 'c1',
      type,
      slug: 'historical-fiction',
      translations: translationSlug
        ? [{ language: 'ru', name: 'Историческая проза', slug: translationSlug }]
        : [],
    }) as unknown as Category;

  it('sends a foreign slug to the language slug', () => {
    expect(
      resolveTaxonomyDestination(
        category('istoricheskaya-proza'),
        'ru',
        'genre',
        'historical-fiction'
      )
    ).toEqual({ segment: 'genre', slug: 'istoricheskaya-proza' });
  });

  it('sends a collection reached under /category/ to /collection/', () => {
    const collection = {
      id: 'c9',
      type: 'collection',
      slug: 'free-books',
      translations: [{ language: 'en', name: 'Free Books', slug: 'free-books' }],
    } as unknown as Category;

    expect(resolveTaxonomyDestination(collection, 'en', 'category', 'free-books')).toEqual({
      segment: 'collection',
      slug: 'free-books',
    });
  });

  it('stays silent when segment and slug are both already right', () => {
    expect(
      resolveTaxonomyDestination(
        category('istoricheskaya-proza'),
        'ru',
        'genre',
        'istoricheskaya-proza'
      )
    ).toBeNull();
  });

  // The loop guard: without it an untranslated term would redirect to the very
  // URL that was just requested, and the browser would give up on a redirect chain.
  it('stays silent when the term has no slug in this language', () => {
    expect(
      resolveTaxonomyDestination(category(null), 'ru', 'genre', 'historical-fiction')
    ).toBeNull();
    expect(resolveTaxonomyDestination(null, 'ru', 'genre', 'historical-fiction')).toBeNull();
  });
});

describe('isUnaddressableInLanguage', () => {
  const withTranslations = (translations: Array<{ language: string; slug: string }>) =>
    ({ id: 'c1', slug: 'historical-fiction', translations }) as unknown as Category;

  it('reports a term that cannot be addressed in this language', () => {
    expect(
      isUnaddressableInLanguage(
        withTranslations([{ language: 'en', slug: 'historical-fiction' }]),
        'ru'
      )
    ).toBe(true);
  });

  it('says nothing about a term that has its own slug here', () => {
    expect(
      isUnaddressableInLanguage(
        withTranslations([{ language: 'ru', slug: 'istoricheskaya-proza' }]),
        'ru'
      )
    ).toBe(false);
  });

  it('leaves a missing term to the caller', () => {
    expect(isUnaddressableInLanguage(null, 'ru')).toBe(false);
  });
});
