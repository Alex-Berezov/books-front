import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TagDetailPage } from '@/components/public/taxonomy/TagDetailPage/TagDetailPage';
import type { RelatedTerm } from '@/types/api-schema';

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('@/components/public/books/BookCard', () => ({ BookCard: () => null }));
// Кнопка «назад» и хлебные крошки тянут роутер App Router, которого в jsdom нет.
// К проверяемому решению они отношения не имеют.
vi.mock('@/components/public/navigation', () => ({ PageBackButton: () => null }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
  usePathname: () => '/en/tag/aestheticism',
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/components/public/taxonomy/TagDetailPage/TagDetailInteractions', () => ({
  TagDetailInteractions: () => null,
}));

/**
 * WP-9. Четыре массива `related*Slugs` рендерились напрямую: существование
 * термина не проверялось, видимость и индексируемость тоже, а текстом ссылки шёл
 * сырой слаг. Замер на проде 09.08.2026 по `en`: из 1039 ссылок 114 вели на
 * несуществующий термин и 622 — на закрытый `noindex`.
 */
describe('TagDetailPage related links', () => {
  const term = (over: Partial<RelatedTerm>): RelatedTerm => ({
    slug: 'power',
    name: 'Power',
    isVisible: true,
    indexable: true,
    autoIndexable: true,
    langBookCount: 7,
    ...over,
  });

  const translations = {
    breadcrumbHome: 'Home',
    allTags: 'Tags',
    browse: '',
    allBooks: '',
    allBooksLink: '',
    tagsLink: '',
    exploreMore: '',
    books: '',
    noBooks: '',
    showMore: '',
    showLess: '',
    about: '',
    faqTitle: '',
    relatedTags: 'Related tags',
    relatedGenres: 'Related genres',
    relatedCategories: 'Related categories',
    relatedCollections: 'Related collections',
    paginationLabel: '',
  };

  const renderWith = (tags: RelatedTerm[]) =>
    render(
      <TagDetailPage
        lang="en"
        tagSlug="aestheticism"
        data={
          {
            tag: {
              id: 't1',
              key: 'aestheticism',
              slug: 'aestheticism',
              name: 'Aestheticism',
              translation: { language: 'en', name: 'Aestheticism', slug: 'aestheticism' },
              relatedTerms: { tags, genres: [], categories: [], collections: [] },
            },
            items: [],
            pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any
        }
        translations={translations}
        currentPage={1}
        totalPages={0}
        total={0}
      />
    );

  // 🔴 Текстом ссылки шёл слаг. Имя термина — то, ради чего его вообще резолвим.
  it('renders the term name, not the raw slug', () => {
    renderWith([term({ slug: 'moral-corruption', name: 'Moral Corruption' })]);

    expect(screen.getByText('Moral Corruption')).toBeInTheDocument();
    expect(screen.queryByText('moral-corruption')).not.toBeInTheDocument();
  });

  // 🔴 Ссылка на закрытый термин нарушает инвариант «ссылка = sitemap = robots».
  it('drops a term that is not indexable', () => {
    renderWith([term({ name: 'Closed', autoIndexable: false, langBookCount: 1 })]);

    expect(screen.queryByText('Closed')).not.toBeInTheDocument();
  });

  // Редакторский переключатель тоже обязан сужать — через тот же предикат.
  it('drops a hidden term', () => {
    renderWith([term({ name: 'Hidden', isVisible: false })]);

    expect(screen.queryByText('Hidden')).not.toBeInTheDocument();
  });

  // Термин без книг не линкуем никогда — это жёсткий пол предиката.
  it('drops a term with no books', () => {
    renderWith([term({ name: 'Empty', langBookCount: 0 })]);

    expect(screen.queryByText('Empty')).not.toBeInTheDocument();
  });

  /**
   * ⚠️ Секция не должна оставаться пустым заголовком: если после фильтра не
   * осталось ни одной ссылки, блока быть не должно вовсе.
   */
  it('hides the whole section when nothing survives the filter', () => {
    renderWith([term({ name: 'Closed', autoIndexable: false, langBookCount: 1 })]);

    expect(screen.queryByText('Related tags')).not.toBeInTheDocument();
  });

  it('keeps a valid term linked to its own page', () => {
    renderWith([term({ slug: 'ambition', name: 'Ambition' })]);

    expect(screen.getByText('Ambition').closest('a')).toHaveAttribute('href', '/en/tag/ambition');
  });
});
