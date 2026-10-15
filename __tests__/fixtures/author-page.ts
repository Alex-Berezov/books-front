import type { BookCardModel, PublicAuthorDetail, PublicAuthorPageBook } from '@/types/api-schema';
import example from './example-author.json';

/**
 * Ответ `GET /ru/authors/lev-tolstoy` для тестов страницы автора (F02-3): блоки — из эталона
 * промпта № 1 (`example-author.json`, копия эталона — не менять), книги сайта — две, как
 * в его слагах. Биографии и подписи портрета промпт № 1 не выдаёт — они добавляются здесь,
 * в тестовом коде (решение арбитра 15.10.2026, `F02 | F02-3`, Р13).
 */

const ru = example.translations.ru;

const SITE_BOOKS: Record<string, PublicAuthorPageBook> = {
  'anna-karenina': {
    slug: 'anna-karenina',
    title: 'Анна Каренина',
    coverUrl: 'https://media.bibliaris.com/covers/anna.jpg',
  },
  'voyna-i-mir': {
    slug: 'voyna-i-mir',
    title: 'Война и мир',
    coverUrl: 'https://media.bibliaris.com/covers/war.jpg',
  },
};

const siteBook = (slug: string | null | undefined) => (slug ? (SITE_BOOKS[slug] ?? null) : null);

export const FULL_BIOGRAPHY = [
  '<h3>Детство и юность</h3><p>Родился в Ясной Поляне.</p>',
  '<figure><img src="https://media.bibliaris.com/authors/yp.jpg" alt="Ясная Поляна"><figcaption>Ясная Поляна, 1890-е</figcaption></figure>',
  '<h3>Война и мир</h3><p>Шесть лет работы над романом.</p>',
  '<h3>Поздние годы</h3><p>Уход из дома.</p>',
].join('');

export const authorBook = (
  over: Partial<BookCardModel & { firstPublishedYear: number | null }> = {}
): BookCardModel & { firstPublishedYear: number | null } => ({
  id: 'b-war',
  slug: 'voyna-i-mir',
  title: 'Война и мир',
  author: 'Лев Толстой',
  authorSlug: 'lev-tolstoy',
  coverImageUrl: null,
  rating: null,
  ratingsCount: 0,
  hasText: true,
  hasAudio: false,
  publishedAt: null,
  categoryIds: [],
  firstPublishedYear: 1869,
  ...over,
});

export function fullAuthor(over: Partial<PublicAuthorDetail> = {}): PublicAuthorDetail {
  return {
    id: 'auth-tolstoy',
    slug: ru.slug,
    name: ru.name,
    nativeName: example.nativeName,
    birthDate: example.birthDate,
    deathDate: example.deathDate,
    photoUrl: 'https://media.bibliaris.com/authors/tolstoy.jpg',
    photoCredit: {
      author: 'Сергей Прокудин-Горский',
      license: 'Public domain',
      licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:L.N.Tolstoy_Prokudin-Gorsky.jpg',
    },
    wikidataUrl: ru.wikidataUrl,
    wikipediaUrl: ru.wikipediaUrl,
    tagline: ru.tagline,
    biography: FULL_BIOGRAPHY,
    facts: ru.facts as PublicAuthorDetail['facts'],
    notableWorks: ru.notableWorks.map((w) => ({
      title: w.title,
      year: w.year,
      ...(w.bookSlug ? { bookSlug: w.bookSlug } : {}),
      book: siteBook(w.bookSlug),
    })),
    startHere: ru.startHere.flatMap((s) => {
      const book = siteBook(s.bookSlug);
      return book ? [{ bookSlug: s.bookSlug, reason: s.reason, book }] : [];
    }),
    timeline: [],
    influences: null,
    awards: ru.awards,
    adaptations: [],
    funFacts: [],
    sources: [],
    quotes: ru.quotes.map((q) => ({ ...q, book: siteBook(q.bookSlug) })),
    faq: [],
    seo: null,
    updatedAt: '2026-10-15T00:00:00.000Z',
    similarAuthors: [],
    alternates: [{ lang: 'ru', slug: ru.slug, indexable: true }],
    booksTotal: 2,
    booksHasAudio: true,
    booksAvgRating: 4.25,
    books: [
      authorBook(),
      authorBook({
        id: 'b-anna',
        slug: 'anna-karenina',
        title: 'Анна Каренина',
        firstPublishedYear: 1878,
      }),
    ],
    ...over,
  } as PublicAuthorDetail;
}

/** Минимальный автор: имя и одна книга (`product.md` F02, §1 п.1). */
export function minimalAuthor(over: Partial<PublicAuthorDetail> = {}): PublicAuthorDetail {
  return fullAuthor({
    nativeName: null,
    birthDate: null,
    deathDate: null,
    photoUrl: null,
    photoCredit: null,
    wikidataUrl: null,
    wikipediaUrl: null,
    tagline: null,
    biography: null,
    facts: null,
    notableWorks: [],
    startHere: [],
    awards: [],
    quotes: [],
    booksTotal: 1,
    booksHasAudio: false,
    booksAvgRating: null,
    books: [authorBook()],
    ...over,
  });
}
