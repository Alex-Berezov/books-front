import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { shownPhotoCredit } from '@/components/public/author/AuthorPhotoCredit/AuthorPhotoCredit';
import { AuthorSources } from '@/components/public/author/AuthorSources/AuthorSources';
import { collectAuthorSources } from '@/lib/author/author-sources';
import { fullAuthor, minimalAuthor } from '../../../fixtures/author-page';

/** F02-4, `product.md` §16: источники, повтор подписи портрета и подпись редакции. */
describe('AuthorSources', () => {
  it('полный автор: источники данных, затем Википедия и Wikidata, подпись портрета и редакции', () => {
    const { container } = render(<AuthorSources lang="ru" author={fullAuthor()} />);

    expect(screen.getByRole('heading', { level: 2, name: 'Источники' })).toBeInTheDocument();
    const links = Array.from(container.querySelectorAll('ul a')).map((a) => a.textContent);
    expect(links).toEqual([
      'Encyclopaedia Britannica: Leo Tolstoy',
      'Wikipedia',
      'Wikidata',
      'Public domain',
      'commons.wikimedia.org',
    ]);
    expect(container.textContent).toContain('Фото: Сергей Прокудин-Горский');
    const team = screen.getByRole('link', { name: 'Редакция Bibliaris' });
    // Р2: автор ведёт в раздел о страницах авторов, а не на `#who` («пишут люди»).
    expect(team).toHaveAttribute('href', '/ru/editorial-policy#authors');
    expect(team.parentElement?.textContent).toBe(
      'Редакция Bibliaris · Обновлено 15 октября 2026 г.'
    );
  });

  it('минимальный автор: заголовка «Источники» нет, подпись редакции есть (Р4)', () => {
    render(<AuthorSources lang="ru" author={minimalAuthor()} />);

    expect(screen.queryByRole('heading', { name: 'Источники' })).toBeNull();
    expect(screen.queryByRole('list')).toBeNull();
    expect(screen.getByRole('link', { name: 'Редакция Bibliaris' })).toBeInTheDocument();
  });

  // Р4 (ответ арбитра): заголовок и список — при ссылке или подписи портрета.
  it('нет ссылок, есть подпись портрета — заголовок и одна строка «Фото»', () => {
    const { container } = render(
      <AuthorSources
        lang="ru"
        author={minimalAuthor({
          photoUrl: 'https://media.bibliaris.com/authors/x.jpg',
          photoCredit: { author: 'Автор фото', license: 'CC0' },
        })}
      />
    );

    expect(screen.getByRole('heading', { level: 2, name: 'Источники' })).toBeInTheDocument();
    expect(container.querySelectorAll('ul li')).toHaveLength(1);
    expect(container.querySelector('ul')?.textContent).toBe('Фото: Автор фото, CC0');
  });

  it('хвостовой / снимается только с пути: адреса с разным query не схлопываются', () => {
    const links = collectAuthorSources({
      sources: [
        { title: 'A', url: 'https://archive.org/details/x?page=/' },
        { title: 'B', url: 'https://archive.org/details/x?page=' },
      ],
      wikipediaUrl: null,
      wikidataUrl: null,
    });

    expect(links.map((l) => l.title)).toEqual(['A', 'B']);
  });

  it('нераспознанная дата — подпись без даты', () => {
    render(<AuthorSources lang="ru" author={minimalAuthor({ updatedAt: 'not-a-date' })} />);

    expect(
      screen.getByRole('link', { name: 'Редакция Bibliaris' }).parentElement?.textContent
    ).toBe('Редакция Bibliaris');
  });

  // Р5: Wikidata в `sources` и в `wikidataUrl` — одна ссылка, с названием из `sources`.
  it('дубль адреса выводится один раз; регистр хоста и хвостовой / не различаются', () => {
    const links = collectAuthorSources({
      sources: [
        { title: 'Wikidata: Leo Tolstoy', url: 'https://WWW.Wikidata.org/wiki/Q7243/' },
        { title: 'Britannica', url: 'https://www.britannica.com/a' },
        { title: 'Britannica again', url: 'https://www.britannica.com/a' },
      ],
      wikipediaUrl: 'https://ru.wikipedia.org/wiki/X',
      wikidataUrl: 'https://www.wikidata.org/wiki/Q7243',
    });

    expect(links.map((l) => l.title)).toEqual(['Wikidata: Leo Tolstoy', 'Britannica', 'Wikipedia']);
  });

  // 🔴 `LEGACY-447`: адреса пишет контент-менеджер, в `href` — только http(s). Перенесено из шапки.
  it('не рендерит javascript: и рендерит соседнюю https-ссылку', () => {
    render(
      <AuthorSources
        lang="en"
        author={minimalAuthor({
          wikipediaUrl: 'javascript:alert(1)',
          wikidataUrl: 'https://www.wikidata.org/wiki/Q7243',
          sources: [{ title: 'Evil', url: 'data:text/html,x' }],
        })}
      />
    );

    expect(screen.queryByRole('link', { name: /Wikipedia|Evil/ })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Wikidata/ })).toHaveAttribute(
      'href',
      'https://www.wikidata.org/wiki/Q7243'
    );
  });

  it('все адреса небезопасны — заголовка и списка нет', () => {
    render(
      <AuthorSources
        lang="en"
        author={minimalAuthor({
          wikipediaUrl: 'javascript:alert(1)',
          wikidataUrl: 'data:text/html,x',
        })}
      />
    );

    expect(screen.queryByRole('heading')).toBeNull();
    expect(screen.queryByRole('list')).toBeNull();
  });

  it('подпись портрета — только при самом портрете (одно правило на шапку и источники)', () => {
    const credit = { author: 'X', license: 'CC0' };
    expect(shownPhotoCredit('https://media.bibliaris.com/a.jpg', credit)).toBe(credit);
    expect(shownPhotoCredit(null, credit)).toBeNull();
    expect(shownPhotoCredit('https://media.bibliaris.com/a.jpg', null)).toBeNull();
  });
});
