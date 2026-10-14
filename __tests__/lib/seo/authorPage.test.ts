// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { authorPersonId, buildAuthorHreflang, describeFromBiography } from '@/lib/seo/author-page';
import { buildIndexableAlternates } from '@/lib/seo/hreflang-alternates';
import { getSiteUrl } from '@/lib/seo/urls';
import type { PublicAuthorAlternate } from '@/types/api-schema';

/**
 * F02-1: адрес, `@id` и `hreflang` страницы автора (`lib/seo/author-page.ts`).
 */

const alternates: PublicAuthorAlternate[] = [
  { lang: 'en', slug: 'oscar-wilde', indexable: true },
  { lang: 'ru', slug: 'oskar-uajld', indexable: true },
  { lang: 'fr', slug: 'oscar-wilde-fr', indexable: false },
];

describe('buildAuthorHreflang', () => {
  /**
   * 🔴 hreflang = карта сайта. Ветка авторов в `app/sitemaps/[filename]/route.ts` строит кластер
   * `buildIndexableAlternates` из слагов языков и линкуемости, адрес — `${base}/${lang}/author/${slug}`.
   * Здесь тот же вызов на тех же кандидатах обязан дать тот же кластер.
   */
  it('совпадает с кластером карты сайта для того же автора', () => {
    const base = getSiteUrl();
    const sitemapCluster = buildIndexableAlternates(
      alternates.map((a) => ({ language: a.lang, slug: a.slug, linkable: a.indexable })),
      (language, slug) => `${base}/${language}/author/${slug}`
    );

    expect(buildAuthorHreflang(alternates)).toEqual(sitemapCluster);
    expect(buildAuthorHreflang(alternates)).toEqual({
      en: `${base}/en/author/oscar-wilde`,
      ru: `${base}/ru/author/oskar-uajld`,
      'x-default': `${base}/en/author/oscar-wilde`,
    });
  });

  it('x-default берётся из отобранного набора, когда английский закрыт', () => {
    const base = getSiteUrl();
    const result = buildAuthorHreflang([
      { lang: 'en', slug: 'oscar-wilde', indexable: false },
      { lang: 'ru', slug: 'oskar-uajld', indexable: true },
    ]);

    expect(result).toEqual({
      ru: `${base}/ru/author/oskar-uajld`,
      'x-default': `${base}/ru/author/oskar-uajld`,
    });
  });

  it('без данных о переводах кластера нет вовсе', () => {
    expect(buildAuthorHreflang(undefined)).toBeUndefined();
    expect(buildAuthorHreflang([])).toBeUndefined();
  });
});

describe('authorPersonId', () => {
  /**
   * 🔴 Та же строка, что строит бэкенд для автора книги: `normalizeUrl(site + /{lang}/author/{slug})`
   * + `#person` (`books/src/modules/seo/schema/generateBookSchema.ts`, `normalizeUrl.ts` — путь
   * в нижнем регистре, без конечного `/`). Литерал зашит намеренно: сравнивать со своей же
   * функцией значило бы проверять код им самим.
   */
  it('совпадает с @id автора в разметке книги', () => {
    expect(authorPersonId('ru', 'oskar-uajld')).toBe(
      `${getSiteUrl()}/ru/author/oskar-uajld#person`
    );
    expect(authorPersonId('ru', 'Oskar-Uajld')).toBe(
      `${getSiteUrl()}/ru/author/oskar-uajld#person`
    );
  });
});

describe('describeFromBiography', () => {
  it('снимает теги и сущности', () => {
    expect(describeFromBiography('<p>Оскар&nbsp;Уайльд — <b>ирландский</b> писатель.</p>')).toBe(
      'Оскар Уайльд — ирландский писатель.'
    );
  });

  it('раскрывает типографские и числовые сущности редактора', () => {
    expect(
      describeFromBiography('<p>&laquo;Сказки&raquo; &mdash; 1888&#8217;s &#x2014; ok</p>')
    ).toBe('«Сказки» — 1888’s — ok');
  });

  it('режет по слову и не длиннее 160 знаков', () => {
    const long = `<p>${'слово '.repeat(60)}</p>`;
    const result = describeFromBiography(long) as string;

    expect(result.length).toBeLessThanOrEqual(160);
    expect(result.endsWith('слово…')).toBe(true);
  });

  it('пустая биография — нет описания', () => {
    expect(describeFromBiography('')).toBeUndefined();
    expect(describeFromBiography('<p> </p>')).toBeUndefined();
    expect(describeFromBiography(null)).toBeUndefined();
  });
});
