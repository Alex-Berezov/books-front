import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { AuthorCard, type AuthorCardLabels } from '@/components/public/authors/AuthorCard';
import type { AuthorListItem } from '@/types/api-schema';

const labels: AuthorCardLabels = {
  books: { one: 'книга', few: 'книги', many: 'книг' },
  audio: { one: 'аудиокнига', few: 'аудиокниги', many: 'аудиокниг' },
  audioBadge: 'аудио',
  bornPrefix: 'род.',
};

const author = (over: Partial<AuthorListItem> = {}): AuthorListItem => ({
  id: 'author-1',
  slug: 'lev-tolstoy',
  name: 'Лев Толстой',
  birthDate: null,
  deathDate: null,
  photoUrl: null,
  shortBio: null,
  translations: [{ language: 'ru', slug: 'lev-tolstoy', name: 'Лев Толстой' }],
  booksCount: 5,
  audioCount: 0,
  ...over,
});

describe('AuthorCard', () => {
  it('renders a fallback icon, not an <img>, when there is no photo', () => {
    const { container } = render(
      <AuthorCard author={author({ photoUrl: null })} labels={labels} lang="ru" />
    );

    expect(container.querySelector('img')).toBeNull();
  });

  it('renders an <img> with alt equal to the author name when there is a photo', () => {
    render(
      <AuthorCard
        author={author({ photoUrl: 'https://api.bibliaris.com/photo.jpg' })}
        labels={labels}
        lang="ru"
      />
    );

    const img = screen.getByAltText('Лев Толстой');
    expect(img.tagName).toBe('IMG');
  });

  it('renders no year string at all when neither date is known', () => {
    const { container } = render(
      <AuthorCard author={author({ birthDate: null, deathDate: null })} labels={labels} lang="ru" />
    );

    expect(container.textContent).not.toContain('—');
    expect(container.textContent).not.toContain('род.');
  });

  it('renders "born — died" when both dates are known', () => {
    render(
      <AuthorCard
        author={author({ birthDate: '1821-11-11', deathDate: '1881-02-09' })}
        labels={labels}
        lang="ru"
      />
    );

    expect(screen.getByText('1821 — 1881')).toBeTruthy();
  });

  it('renders the born-prefix year when only the birth date is known (author is alive)', () => {
    render(
      <AuthorCard
        author={author({ birthDate: '1952-01-01', deathDate: null })}
        labels={labels}
        lang="ru"
      />
    );

    expect(screen.getByText('род. 1952')).toBeTruthy();
  });

  it('renders no audio badge when audioCount is 0', () => {
    render(<AuthorCard author={author({ audioCount: 0 })} labels={labels} lang="ru" />);

    expect(screen.queryByText(labels.audioBadge, { exact: false })).toBeNull();
  });

  it('renders no audio badge when audioCount is missing entirely (unknown is not zero)', () => {
    const withoutAudioCount = author();
    delete (withoutAudioCount as Partial<AuthorListItem>).audioCount;

    render(<AuthorCard author={withoutAudioCount} labels={labels} lang="ru" />);

    expect(screen.queryByText(labels.audioBadge, { exact: false })).toBeNull();
  });

  it('renders the audio badge when audioCount is known and positive', () => {
    render(<AuthorCard author={author({ audioCount: 9 })} labels={labels} lang="ru" />);

    expect(screen.queryByText(labels.audioBadge, { exact: false })).not.toBeNull();
  });

  it('uses the singular books label for booksCount 1', () => {
    render(<AuthorCard author={author({ booksCount: 1 })} labels={labels} lang="ru" />);

    expect(screen.getByText(`1 ${labels.books.one}`)).toBeTruthy();
  });

  it('uses the plural books label for booksCount 28', () => {
    render(<AuthorCard author={author({ booksCount: 28 })} labels={labels} lang="ru" />);

    expect(screen.getByText(`28 ${labels.books.many}`)).toBeTruthy();
  });

  // 🔴 Русская форма 2-4: пара форм давала «2 книг» и «21 книг» — неверную
  // подпись у каждого второго числа.
  it('uses the Russian few form for 2-4 and the many form for 11-14', () => {
    render(<AuthorCard author={author({ booksCount: 2 })} labels={labels} lang="ru" />);
    expect(screen.getByText(`2 ${labels.books.few}`)).toBeTruthy();
  });

  it('uses the singular form for 21 and the many form for 11', () => {
    const { unmount } = render(
      <AuthorCard author={author({ booksCount: 21 })} labels={labels} lang="ru" />
    );
    expect(screen.getByText(`21 ${labels.books.one}`)).toBeTruthy();
    unmount();

    render(<AuthorCard author={author({ booksCount: 11 })} labels={labels} lang="ru" />);
    expect(screen.getByText(`11 ${labels.books.many}`)).toBeTruthy();
  });

  it('renders a long name in full without crashing', () => {
    const longName = 'А'.repeat(65);
    render(<AuthorCard author={author({ name: longName })} labels={labels} lang="ru" />);

    expect(screen.getByText(longName)).toBeTruthy();
  });

  it('resolves the slug from the translation matching the page language, not the root slug', () => {
    render(
      <AuthorCard
        author={author({
          slug: 'sun-tzu',
          translations: [
            { language: 'ru', slug: 'sun-czy', name: 'Сунь-цзы' },
            { language: 'en', slug: 'sun-tzu', name: 'Sun Tzu' },
          ],
        })}
        labels={labels}
        lang="ru"
      />
    );

    expect(screen.getByRole('link')).toHaveAttribute('href', '/ru/author/sun-czy');
  });

  it('renders nothing when there is no translation for the page language', () => {
    const { container } = render(
      <AuthorCard
        author={author({
          translations: [{ language: 'en', slug: 'sun-tzu', name: 'Sun Tzu' }],
        })}
        labels={labels}
        lang="ru"
      />
    );

    expect(container).toBeEmptyDOMElement();
  });
});
