import { describe, expect, it } from 'vitest';
import { authorNameFromSlug, buildAuthorPageGraph, describeAuthor } from '@/lib/seo/author-page';
import { getSiteUrl } from '@/lib/seo/urls';
import type { PublicAuthorDetail } from '@/types/api-schema';
import { fullAuthor, minimalAuthor } from '../../fixtures/author-page';

/**
 * F02-3, `product.md` §18 и `tech.md` §7: разметка страницы автора одним `@graph`. Ожидания —
 * литералами (снимок полного и минимального автора): сверять граф с той же функцией значило бы
 * проверять код им самим. `@id` Person — строка, которую строит бэкенд для автора книги
 * (`generateBookSchema.ts`: `normalizeUrl(site + /ru/author/{slug}) + #person`).
 */

const crumbs = { home: 'Главная', authors: 'Авторы' };

describe('buildAuthorPageGraph', () => {
  it('полный автор — снимок графа', () => {
    const base = getSiteUrl();
    const page = `${base}/ru/author/lev-tolstoy`;
    const person = `${page}#person`;

    expect(buildAuthorPageGraph('ru', fullAuthor(), crumbs)).toEqual({
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'WebPage',
          '@id': `${page}#webpage`,
          url: page,
          name: 'Лев Толстой',
          inLanguage: 'ru',
          description: fullAuthor().tagline,
          mainEntity: { '@id': person },
          breadcrumb: { '@id': `${page}#breadcrumb` },
        },
        {
          '@type': 'Person',
          '@id': person,
          name: 'Лев Толстой',
          url: page,
          alternateName: ['Лев Николаевич Толстой'],
          image: {
            '@type': 'ImageObject',
            url: 'https://media.bibliaris.com/authors/tolstoy.jpg',
            contentUrl: 'https://media.bibliaris.com/authors/tolstoy.jpg',
            creditText: 'Сергей Прокудин-Горский',
            license: 'https://creativecommons.org/publicdomain/mark/1.0/',
            acquireLicensePage:
              'https://commons.wikimedia.org/wiki/File:L.N.Tolstoy_Prokudin-Gorsky.jpg',
          },
          description: fullAuthor().tagline,
          birthDate: '1828-09-09',
          deathDate: '1910-11-20',
          birthPlace: { '@type': 'Place', name: 'Ясная Поляна, Российская империя' },
          deathPlace: { '@type': 'Place', name: 'Астапово, Российская империя' },
          nationality: { '@type': 'Country', name: 'Россия' },
          hasOccupation: [
            { '@type': 'Occupation', name: 'писатель' },
            { '@type': 'Occupation', name: 'публицист' },
          ],
          knowsAbout: ['роман', 'повесть', 'рассказ'],
          sameAs: [fullAuthor().wikidataUrl, fullAuthor().wikipediaUrl],
        },
        {
          '@type': 'ItemList',
          '@id': `${page}#books`,
          numberOfItems: 2,
          itemListElement: [
            {
              '@type': 'ListItem',
              position: 1,
              item: {
                '@type': 'Book',
                '@id': `${base}/ru/book/voyna-i-mir#book`,
                name: 'Война и мир',
                url: `${base}/ru/book/voyna-i-mir`,
                author: { '@id': person },
              },
            },
            {
              '@type': 'ListItem',
              position: 2,
              item: {
                '@type': 'Book',
                '@id': `${base}/ru/book/anna-karenina#book`,
                name: 'Анна Каренина',
                url: `${base}/ru/book/anna-karenina`,
                author: { '@id': person },
              },
            },
          ],
        },
        {
          '@type': 'BreadcrumbList',
          '@id': `${page}#breadcrumb`,
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Главная', item: `${base}/ru` },
            { '@type': 'ListItem', position: 2, name: 'Авторы', item: `${base}/ru/authors` },
            { '@type': 'ListItem', position: 3, name: 'Лев Толстой', item: page },
          ],
        },
      ],
    });
  });

  it('минимальный автор — снимок графа: без пустых полей Person', () => {
    const base = getSiteUrl();
    const page = `${base}/ru/author/lev-tolstoy`;
    const graph = buildAuthorPageGraph('ru', minimalAuthor(), crumbs)['@graph'] as Array<
      Record<string, unknown>
    >;

    expect(graph.map((n) => n['@type'])).toEqual([
      'WebPage',
      'Person',
      'ItemList',
      'BreadcrumbList',
    ]);
    expect(graph[1]).toEqual({
      '@type': 'Person',
      '@id': `${page}#person`,
      name: 'Лев Толстой',
      url: page,
    });
    expect(graph[0]).not.toHaveProperty('description');
  });

  // Решение арбитра 15.10.2026, `F02 | F02-3`, Р10: номинация наградой не является.
  it('award — только полученные награды, номинации нет', () => {
    const graph = buildAuthorPageGraph(
      'ru',
      fullAuthor({
        awards: [
          { name: 'Нобелевская премия по литературе', year: 1902, nomination: true },
          { name: 'Пушкинская премия', year: 1880 },
        ],
      }),
      crumbs
    )['@graph'] as Array<Record<string, unknown>>;

    expect(graph[1].award).toEqual(['Пушкинская премия (1880)']);
  });

  it('alternateName — родное имя и псевдонимы; награда без года — без скобок', () => {
    const base = fullAuthor();
    const graph = buildAuthorPageGraph(
      'ru',
      fullAuthor({
        facts: { ...base.facts, pseudonyms: ['Л. Н.'] },
        awards: [{ name: 'Орден' }],
      }),
      crumbs
    )['@graph'] as Array<Record<string, unknown>>;

    expect(graph[1].alternateName).toEqual(['Лев Николаевич Толстой', 'Л. Н.']);
    expect(graph[1].award).toEqual(['Орден']);
  });

  // Р11: в списке — показанные книги, `numberOfItems` — все книги автора.
  it('ItemList — показанные книги, numberOfItems — booksTotal', () => {
    const graph = buildAuthorPageGraph('ru', fullAuthor({ booksTotal: 40 }), crumbs)[
      '@graph'
    ] as Array<Record<string, unknown>>;
    const list = graph.find((n) => n['@type'] === 'ItemList') as Record<string, unknown>;

    expect(list.numberOfItems).toBe(40);
    expect(list.itemListElement).toHaveLength(2);
  });

  // Адреса подписи пишет контент-менеджер: в разметку не уходит не-http(s), как и в видимую подпись.
  it('небезопасные адреса подписи портрета в ImageObject не попадают', () => {
    const graph = buildAuthorPageGraph(
      'ru',
      fullAuthor({
        photoCredit: {
          author: 'X',
          license: 'CC BY',
          licenseUrl: 'javascript:alert(1)',
          sourceUrl: 'data:text/html,x',
        },
      }),
      crumbs
    )['@graph'] as Array<Record<string, unknown>>;

    expect(graph[1].image).toEqual({
      '@type': 'ImageObject',
      url: 'https://media.bibliaris.com/authors/tolstoy.jpg',
      contentUrl: 'https://media.bibliaris.com/authors/tolstoy.jpg',
      creditText: 'X',
    });
  });

  // `LEGACY-447`: адреса Википедии и Wikidata пишет контент-менеджер — в sameAs только http(s).
  it('sameAs — без небезопасных адресов', () => {
    const graph = buildAuthorPageGraph(
      'ru',
      fullAuthor({ wikipediaUrl: 'javascript:alert(1)' }),
      crumbs
    )['@graph'] as Array<Record<string, unknown>>;

    expect(graph[1].sameAs).toEqual([fullAuthor().wikidataUrl]);
  });

  it('без книг узла ItemList нет', () => {
    const graph = buildAuthorPageGraph('ru', minimalAuthor({ books: [], booksTotal: 0 }), crumbs)[
      '@graph'
    ] as Array<Record<string, unknown>>;

    expect(graph.some((n) => n['@type'] === 'ItemList')).toBe(false);
  });

  it('портрет без подписи — image строкой, родное имя как у страницы — не alternateName', () => {
    const graph = buildAuthorPageGraph(
      'ru',
      fullAuthor({ photoCredit: null, nativeName: 'Лев Толстой' }),
      crumbs
    )['@graph'] as Array<Record<string, unknown>>;

    expect(graph[1].image).toBe('https://media.bibliaris.com/authors/tolstoy.jpg');
    expect(graph[1]).not.toHaveProperty('alternateName');
  });
});

describe('authorNameFromSlug', () => {
  // Запасной заголовок вкладки при сбое бэкенда: слова слага с заглавной.
  it('слова слага — с заглавной, остальное строчными', () => {
    expect(authorNameFromSlug('lev-tolstoy')).toBe('Lev Tolstoy');
    expect(authorNameFromSlug('oscar-wilde')).toBe('Oscar Wilde');
    expect(authorNameFromSlug('%E0%A4%A')).toBe('%E0%a4%a');
  });
});

describe('describeAuthor', () => {
  it('своё описание → tagline → начало биографии', () => {
    expect(
      describeAuthor({
        seo: { metaDescription: 'Своё' } as PublicAuthorDetail['seo'],
        tagline: 'Строка',
        biography: '<p>Био</p>',
      })
    ).toBe('Своё');
    expect(describeAuthor({ seo: null, tagline: 'Строка', biography: '<p>Био</p>' })).toBe(
      'Строка'
    );
    expect(describeAuthor({ seo: null, tagline: '  ', biography: '<p>Био</p>' })).toBe('Био');
    expect(describeAuthor({ seo: null, tagline: null, biography: null })).toBeUndefined();
  });
});
