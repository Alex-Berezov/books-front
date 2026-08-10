import { describe, expect, it } from 'vitest';
import { buildIndexableAlternates, toAlternateCandidates } from '@/lib/seo/hreflang-alternates';
import { isTaxonomyLinkable } from '@/lib/seo/taxonomy-linkable';

/**
 * `LEGACY-057`. URL попадал в sitemap только если термин линкуем в языке файла,
 * но блок `alternates` строился по **всем** переводам без проверки. Термин с
 * книгами на `en` и нулём на `ru` давал корректный `/en/...` с `hreflang="ru"`
 * на страницу, отдающую `noindex`.
 *
 * ⚠️ Google трактует hreflang на noindex как противоречивый сигнал и может
 * обесценить **весь** кластер, а не отбросить одну ссылку, — поэтому цена не
 * пропорциональна числу плохих языков.
 */
describe('buildIndexableAlternates', () => {
  const href = (lang: string, slug: string) => `https://x.test/${lang}/genre/${slug}`;

  it('lists every indexable language', () => {
    const res = buildIndexableAlternates(
      [
        { language: 'en', slug: 'adventure', linkable: true },
        { language: 'ru', slug: 'priklyucheniya', linkable: true },
      ],
      href
    );

    expect(res).toEqual({
      en: 'https://x.test/en/genre/adventure',
      ru: 'https://x.test/ru/genre/priklyucheniya',
      'x-default': 'https://x.test/en/genre/adventure',
    });
  });

  // 🔴 Сам дефект.
  it('drops a language whose page answers noindex', () => {
    const res = buildIndexableAlternates(
      [
        { language: 'en', slug: 'adventure', linkable: true },
        { language: 'ru', slug: 'priklyucheniya', linkable: false },
      ],
      href
    );

    expect(res).not.toHaveProperty('ru');
    expect(res).toHaveProperty('en');
  });

  /**
   * 🔴 `x-default` раньше брался из английского перевода независимо от его
   * состояния: у термина, закрытого именно на `en`, канонической альтернативой
   * объявлялась noindex-страница.
   */
  it('recomputes x-default over the filtered set', () => {
    const res = buildIndexableAlternates(
      [
        { language: 'en', slug: 'adventure', linkable: false },
        { language: 'ru', slug: 'priklyucheniya', linkable: true },
      ],
      href
    );

    expect(res?.['x-default']).toBe('https://x.test/ru/genre/priklyucheniya');
  });

  /**
   * ⚠️ Пустой кластер и отсутствие кластера — не одно и то же. Если не осталось
   * ни одного индексируемого языка, блок альтернатив не выводится вовсе.
   */
  it('returns undefined when no language survives', () => {
    const res = buildIndexableAlternates(
      [{ language: 'en', slug: 'adventure', linkable: false }],
      href
    );

    expect(res).toBeUndefined();
  });

  // Перевод без слага адреса не имеет — в кластер ему попадать нечем.
  it('ignores a translation without a slug', () => {
    const res = buildIndexableAlternates(
      [
        { language: 'en', slug: 'adventure', linkable: true },
        { language: 'fr', slug: '', linkable: true },
      ],
      href
    );

    expect(res).not.toHaveProperty('fr');
  });
});

/**
 * 🔴 Функция перенесена сюда из `app/sitemaps/[filename]/route.ts`: внутри
 * маршрута она была недостижима для тестов, и правило оказалось единственным
 * непроверяемым звеном контура «ссылка = sitemap = robots».
 */
describe('toAlternateCandidates', () => {
  const term = { isVisible: true, indexable: true };

  it('takes indexability from each translation, not from the term as a whole', () => {
    const res = toAlternateCandidates(
      term,
      [
        { language: 'en', slug: 'adventure', autoIndexable: true, bookCount: 7 },
        { language: 'ru', slug: 'priklyucheniya', autoIndexable: false, bookCount: 1 },
      ],
      isTaxonomyLinkable
    );

    expect(res).toEqual([
      { language: 'en', slug: 'adventure', linkable: true },
      { language: 'ru', slug: 'priklyucheniya', linkable: false },
    ]);
  });

  // Редакторский переключатель общий для всех языков и обязан закрыть каждый.
  it('lets a term-level switch close every language', () => {
    const res = toAlternateCandidates(
      { isVisible: false, indexable: true },
      [{ language: 'en', slug: 'adventure', autoIndexable: true, bookCount: 7 }],
      isTaxonomyLinkable
    );

    expect(res[0].linkable).toBe(false);
  });

  // Перевод без слага адреса не имеет — в кандидаты ему попадать нечем.
  it('skips a translation without a slug', () => {
    const res = toAlternateCandidates(
      term,
      [
        { language: 'en', slug: 'adventure', autoIndexable: true, bookCount: 7 },
        { language: 'fr', autoIndexable: true, bookCount: 7 },
      ],
      isTaxonomyLinkable
    );

    expect(res.map((c) => c.language)).toEqual(['en']);
  });
});
