import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HomePageContent } from '@/components/public/home/HomePageContent/HomePageContent';
import type { BookCardModel } from '@/types/api-schema';

/**
 * Разделы книг главной без книг не рисуются. Страница собирается на сервере с
 * `.catch(() => null)` на каждый запрос (`app/[lang]/page.tsx`) и кэшируется на 5 минут:
 * не ответил бэкенд, например при перезапуске на выкате, - и «Top Popular» с «New Releases»
 * висели пустыми, с заголовком и «книг не найдено», хотя соседние разделы в том же
 * случае скрывались.
 */

const labels = {
  heroTitle: '',
  heroText: '',
  browseLibrary: '',
  audiobooks: '',
  topPopular: 'Top Popular',
  browseByCategory: '',
  viewAll: '',
  bookForms: { one: '', few: '', many: '' },
  genres: '',
  curatedCollections: '',
  newReleases: 'New Releases',
  exploreBookThemes: '',
  classicLiterature: '',
  fantasyAdventure: '',
  authors: '',
  whyBibliaris: '',
  aboutBibliaris: '',
  faq: '',
  viewMore: 'View More',
  readLabel: 'Read',
  listenLabel: 'Listen',
  newLabel: 'New',
  coverAltTemplate: '{title}',
  unknownAuthor: '',
};

const book: BookCardModel = {
  id: 'book-1',
  slug: 'hamlet',
  title: 'Hamlet',
  author: 'William Shakespeare',
  authorSlug: null,
  coverImageUrl: null,
  rating: null,
  ratingsCount: 0,
  hasText: true,
  hasAudio: false,
  hasSummary: false,
  publishedAt: null,
  categoryIds: [],
};

function renderHome(featured: BookCardModel[], releases: BookCardModel[]) {
  return render(
    <HomePageContent
      lang="en"
      labels={labels}
      featuredBooks={featured}
      newReleases={releases}
      audiobooks={[]}
      classicBooks={[]}
      fantasyBooks={[]}
      featuredCategories={[]}
      featuredGenres={[]}
      featuredCollections={[]}
      featuredTags={[]}
      featuredAuthors={[]}
      collectionSections={[]}
      heroStackBooks={[]}
      audiobooksCount={0}
      faqItems={null}
      whyBibliaris={[]}
      aboutText=""
    />
  );
}

const sectionOf = (name: string) =>
  screen.getByRole('heading', { level: 2, name }).closest('section') as HTMLElement;

describe('HomePageContent: book sections without books', () => {
  it('does not render Top Popular and New Releases when both lists are empty', () => {
    renderHome([], []);

    expect(screen.queryByRole('heading', { name: 'Top Popular' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'New Releases' })).not.toBeInTheDocument();
  });

  // Отказ бэкенда обычно роняет один запрос, а не оба: каждый раздел решает сам за себя.
  it('hides only Top Popular when popular books are missing', () => {
    renderHome([], [book]);

    expect(screen.queryByRole('heading', { name: 'Top Popular' })).not.toBeInTheDocument();
    expect(within(sectionOf('New Releases')).getAllByText('Hamlet').length).toBeGreaterThan(0);
  });

  it('hides only New Releases when new books are missing', () => {
    renderHome([book], []);

    expect(screen.queryByRole('heading', { name: 'New Releases' })).not.toBeInTheDocument();
    expect(within(sectionOf('Top Popular')).getAllByText('Hamlet').length).toBeGreaterThan(0);
  });
});
