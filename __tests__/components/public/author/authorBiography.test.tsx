import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AuthorBiography } from '@/components/public/author/AuthorBiography/AuthorBiography';
import { FULL_BIOGRAPHY } from '../../../fixtures/author-page';

/** F02-3, `product.md` §8: биография с оглавлением при трёх и более разделах. */
describe('AuthorBiography', () => {
  it('три раздела — оглавление, якоря ведут на id разделов в тексте', () => {
    const { container } = render(<AuthorBiography lang="ru" biography={FULL_BIOGRAPHY} />);

    expect(screen.getByRole('heading', { level: 2, name: 'Биография' })).toBeInTheDocument();
    const navs = screen.getAllByRole('navigation', { name: 'Содержание', hidden: true });
    expect(navs.length).toBeGreaterThan(0);
    const hrefs = within(navs[0])
      .getAllByRole('link', { hidden: true })
      .map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual(['#bio-detstvo-i-yunost', '#bio-voyna-i-mir', '#bio-pozdnie-gody']);
    for (const href of hrefs) {
      expect(container.querySelector(`h3${href}`)).not.toBeNull();
    }
  });

  it('подпись к картинке остаётся под ней', () => {
    const { container } = render(<AuthorBiography lang="ru" biography={FULL_BIOGRAPHY} />);

    expect(container.querySelector('figure figcaption')).toHaveTextContent('Ясная Поляна, 1890-е');
  });

  it('меньше трёх разделов — без оглавления', () => {
    const { container } = render(
      <AuthorBiography lang="ru" biography="<h3>Один</h3><p>a</p><h3>Два</h3><p>b</p>" />
    );

    expect(container.querySelector('nav')).toBeNull();
    expect(screen.queryByText('Содержание')).not.toBeInTheDocument();
  });

  it('старая биография без разделов — как есть, без оглавления', () => {
    const { container } = render(
      <AuthorBiography lang="ru" biography={'Первая строка.\nВторая строка.'} />
    );

    expect(screen.getByText(/Первая строка\.\s+Вторая строка\./)).toBeInTheDocument();
    expect(container.querySelector('nav')).toBeNull();
  });

  it('пустая биография — блока нет', () => {
    const { container } = render(<AuthorBiography lang="ru" biography={null} />);

    expect(container).toBeEmptyDOMElement();
  });
});
