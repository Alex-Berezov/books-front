import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { authorsBasePath } from '@/components/public/authors/authors-href';
import { AuthorsAlphabet } from '@/components/public/authors/AuthorsAlphabet';
import type { AuthorLetter } from '@/types/api-schema';

const labels = { all: 'Все', alphabetLabel: 'Алфавитный указатель' };

describe('AuthorsAlphabet', () => {
  it('renders a letter with count 0 as a non-clickable <span>, not a link', () => {
    const letters: AuthorLetter[] = [{ letter: 'Ж', count: 0 }];
    render(<AuthorsAlphabet activeLetter={null} labels={labels} lang="ru" letters={letters} />);

    const entry = screen.getByText('Ж');
    expect(entry.closest('a')).toBeNull();
  });

  it('renders a letter with a count as a link to /:lang/authors/letter/:letter', () => {
    const letters: AuthorLetter[] = [{ letter: 'Т', count: 12 }];
    render(<AuthorsAlphabet activeLetter={null} labels={labels} lang="ru" letters={letters} />);

    const link = screen.getByText('Т').closest('a');
    expect(link).toHaveAttribute('href', '/ru/authors/letter/%d1%82');
  });

  it('encodes a Cyrillic letter, matching authorsBasePath exactly', () => {
    const letters: AuthorLetter[] = [{ letter: 'Д', count: 3 }];
    render(<AuthorsAlphabet activeLetter={null} labels={labels} lang="ru" letters={letters} />);

    const link = screen.getByText('Д').closest('a');
    expect(link).toHaveAttribute('href', authorsBasePath('ru', 'Д'));
  });

  it('marks the active letter with aria-current="page"', () => {
    const letters: AuthorLetter[] = [
      { letter: 'А', count: 2 },
      { letter: 'Б', count: 4 },
    ];
    render(<AuthorsAlphabet activeLetter="Б" labels={labels} lang="ru" letters={letters} />);

    expect(screen.getByText('Б').closest('a')).toHaveAttribute('aria-current', 'page');
    expect(screen.getByText('А').closest('a')).not.toHaveAttribute('aria-current');
  });

  it('links "all" to /:lang/authors and marks it active when activeLetter is null', () => {
    const letters: AuthorLetter[] = [{ letter: 'А', count: 2 }];
    const { rerender } = render(
      <AuthorsAlphabet activeLetter={null} labels={labels} lang="ru" letters={letters} />
    );

    const allLink = screen.getByText(labels.all);
    expect(allLink).toHaveAttribute('href', '/ru/authors');
    expect(allLink.className).toMatch(/active/i);

    rerender(<AuthorsAlphabet activeLetter="А" labels={labels} lang="ru" letters={letters} />);
    expect(screen.getByText(labels.all).className).not.toMatch(/active/i);
  });

  it('renders nothing when the letter list is empty', () => {
    const { container } = render(
      <AuthorsAlphabet activeLetter={null} labels={labels} lang="ru" letters={[]} />
    );

    expect(container).toBeEmptyDOMElement();
  });
});
