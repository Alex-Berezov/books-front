import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import BookExtraDetails from '@/app/[lang]/book/[slug]/BookExtraDetails';
import type { BookOverview } from '@/types/api-schema';

/**
 * F03-2, `product.md` §22: у блоков персонажей, символов и цитат на странице книги - ссылка
 * «Разбор» на раздел анализа; раздела в анализе нет - нет и ссылки (§1.4).
 */

const version = {
  id: 'v1',
  characters: [{ name: 'Hamlet', description: 'Prince' }],
  symbols: [{ title: 'Skull', description: 'Mortality' }],
  quotes: [{ text: 'To be' }],
  faq: [],
} as unknown as BookOverview['versions'][0];

describe('BookExtraDetails: ссылки «Разбор»', () => {
  it('ссылки ведут на разделы анализа, отсутствующий раздел ссылки не даёт', () => {
    render(
      <BookExtraDetails
        activeVersion={version}
        analysisLinks={{
          characters: '/en/book/hamlet/analysis#characters',
          symbols: null,
          quotes: '/en/book/hamlet/analysis#key-quotes',
        }}
      />
    );

    expect(
      screen.getAllByRole('link', { name: 'Analysis' }).map((a) => a.getAttribute('href'))
    ).toEqual(['/en/book/hamlet/analysis#characters', '/en/book/hamlet/analysis#key-quotes']);
  });

  // F03-3: у цитат ссылка - под заголовком, как у символов и персонажей, а не под блоком.
  it('у всех трёх блоков ссылка «Разбор» идёт сразу после заголовка', () => {
    const { container } = render(
      <BookExtraDetails
        activeVersion={version}
        analysisLinks={{
          characters: '/en/book/hamlet/analysis#characters',
          symbols: '/en/book/hamlet/analysis#symbols',
          quotes: '/en/book/hamlet/analysis#key-quotes',
        }}
      />
    );

    const headings = [...container.querySelectorAll('h2')];
    expect(headings).toHaveLength(3);
    for (const h2 of headings) {
      const next = h2.nextElementSibling;
      expect(next?.tagName).toBe('A');
      expect(next?.textContent).toBe('Analysis');
    }
  });

  it('анализа нет - ссылок «Разбор» нет', () => {
    render(<BookExtraDetails activeVersion={version} analysisLinks={null} />);
    expect(screen.queryByRole('link', { name: 'Analysis' })).toBeNull();
  });
});
