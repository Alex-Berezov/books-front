// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { toBookCardModelFromAuthorBook } from '@/lib/mappers/book';
import type { PublicAuthorBook } from '@/types/api-schema';

/** Настоящий слаг автора — тот, по которому открыта страница. Транслитерация имени с ним не совпадает. */
const AUTHOR_SLUG = 'sun-czy';

const authorBook = (overrides: Partial<PublicAuthorBook> = {}): PublicAuthorBook => ({
  id: 'version-1',
  bookId: 'book-1',
  slug: 'dracula',
  title: 'Dracula',
  author: 'Bram Stoker',
  coverImageUrl: 'https://media.bibliaris.com/dracula.png',
  type: 'text',
  isFree: true,
  versions: [],
  ...overrides,
});

/**
 * Карточка книги на странице автора. Ручка отдаёт узкую форму, поэтому каждая ветка здесь —
 * решение «что показать, когда поля нет», а не украшение: обложка приходит двумя разными
 * именами, рейтинг может отсутствовать, а признаки текста и аудио выводятся из версий.
 */
describe('toBookCardModelFromAuthorBook', () => {
  it('берёт заголовок, автора и слаг с верхнего уровня', () => {
    const card = toBookCardModelFromAuthorBook(authorBook(), AUTHOR_SLUG);

    expect(card.id).toBe('version-1');
    expect(card.slug).toBe('dracula');
    expect(card.title).toBe('Dracula');
    expect(card.author).toBe('Bram Stoker');
  });

  /**
   * 🔴 LEGACY-006. Раньше слаг собирался здесь из отображаемого имени
   * (`author.trim().toLowerCase().replace(/\s+/g, '-')`), и карточка вела на адрес,
   * которого нет: настоящий слаг бывает транслитерацией — «Сунь-цзы» лежит под `sun-czy`.
   * Теперь слаг **передаётся** — страница автора знает его из своего адреса.
   */
  it('берёт переданный слаг автора и не выводит его из имени', () => {
    expect(
      toBookCardModelFromAuthorBook(authorBook({ author: 'Сунь-цзы' }), AUTHOR_SLUG).authorSlug
    ).toBe('sun-czy');
    // Имя с лишними пробелами на слаг больше не влияет вовсе.
    expect(
      toBookCardModelFromAuthorBook(authorBook({ author: '  Bram   Stoker ' }), AUTHOR_SLUG)
        .authorSlug
    ).toBe('sun-czy');
  });

  // Слага нет — карточка отдаёт `null`, и `BookCard` рисует имя текстом без ссылки.
  // Выдуманный адрес хуже отсутствия ссылки.
  it('без переданного слага отдаёт null, а не собирает его из имени', () => {
    expect(
      toBookCardModelFromAuthorBook(authorBook({ author: 'Bram Stoker' }), null).authorSlug
    ).toBeNull();
  });

  it('падает с coverImageUrl на coverUrl, а без обеих отдаёт null', () => {
    expect(
      toBookCardModelFromAuthorBook(
        authorBook({ coverImageUrl: '', coverUrl: 'https://media.bibliaris.com/alt.png' }),
        AUTHOR_SLUG
      ).coverImageUrl
    ).toBe('https://media.bibliaris.com/alt.png');

    expect(
      toBookCardModelFromAuthorBook(authorBook({ coverImageUrl: '', coverUrl: null }), AUTHOR_SLUG)
        .coverImageUrl
    ).toBeNull();
  });

  it('отсутствующий рейтинг остаётся null, а не нулём', () => {
    expect(toBookCardModelFromAuthorBook(authorBook(), AUTHOR_SLUG).rating).toBeNull();
    expect(toBookCardModelFromAuthorBook(authorBook({ rating: 4.5 }), AUTHOR_SLUG).rating).toBe(
      4.5
    );
  });

  it('выводит доступность текста и аудио из версий', () => {
    const card = toBookCardModelFromAuthorBook(
      authorBook({
        versions: [
          {
            language: 'en',
            status: 'published',
            type: 'audio',
            coverImageUrl: '',
            coverUrl: '',
          },
        ],
      }),
      AUTHOR_SLUG
    );

    expect(card.hasAudio).toBe(true);
    expect(card.hasText).toBe(false);
  });

  it('черновая версия доступности не даёт, хотя тип у неё аудио', () => {
    // Ручка автора сегодня отдаёт только опубликованное, но `status` в ответе есть,
    // и молчаливая опора на фильтр чужого запроса - это как раз то, как карточка
    // однажды покажет «есть аудио» для черновика.
    const card = toBookCardModelFromAuthorBook(
      authorBook({
        versions: [
          { language: 'en', status: 'draft', type: 'audio', coverImageUrl: '', coverUrl: '' },
        ],
      }),
      AUTHOR_SLUG
    );

    expect(card.hasAudio).toBe(false);
    expect(card.hasText).toBe(false);
  });

  it('без версий обе доступности false', () => {
    const card = toBookCardModelFromAuthorBook(authorBook({ versions: [] }), AUTHOR_SLUG);

    expect(card.hasText).toBe(false);
    expect(card.hasAudio).toBe(false);
  });

  it('поля, которых ручка не отдаёт, заполняются пусто, а не выдумываются', () => {
    const card = toBookCardModelFromAuthorBook(authorBook(), AUTHOR_SLUG);

    expect(card.ratingsCount).toBe(0);
    expect(card.publishedAt).toBeNull();
    expect(card.categoryIds).toEqual([]);
  });
});
