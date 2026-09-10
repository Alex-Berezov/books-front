// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { toBookCardModelFromAuthorBook } from '@/lib/mappers/book';
import type { PublicAuthorBook } from '@/types/api-schema';

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
    const card = toBookCardModelFromAuthorBook(authorBook());

    expect(card.id).toBe('version-1');
    expect(card.slug).toBe('dracula');
    expect(card.title).toBe('Dracula');
    expect(card.author).toBe('Bram Stoker');
  });

  it('собирает слаг автора из имени и отдаёт null на пустом имени', () => {
    expect(
      toBookCardModelFromAuthorBook(authorBook({ author: '  Bram   Stoker ' })).authorSlug
    ).toBe('bram-stoker');
    expect(toBookCardModelFromAuthorBook(authorBook({ author: '' })).authorSlug).toBeNull();
  });

  it('падает с coverImageUrl на coverUrl, а без обеих отдаёт null', () => {
    expect(
      toBookCardModelFromAuthorBook(
        authorBook({ coverImageUrl: '', coverUrl: 'https://media.bibliaris.com/alt.png' })
      ).coverImageUrl
    ).toBe('https://media.bibliaris.com/alt.png');

    expect(
      toBookCardModelFromAuthorBook(authorBook({ coverImageUrl: '', coverUrl: null })).coverImageUrl
    ).toBeNull();
  });

  it('отсутствующий рейтинг остаётся null, а не нулём', () => {
    expect(toBookCardModelFromAuthorBook(authorBook()).rating).toBeNull();
    expect(toBookCardModelFromAuthorBook(authorBook({ rating: 4.5 })).rating).toBe(4.5);
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
      })
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
      })
    );

    expect(card.hasAudio).toBe(false);
    expect(card.hasText).toBe(false);
  });

  it('без версий обе доступности false', () => {
    const card = toBookCardModelFromAuthorBook(authorBook({ versions: [] }));

    expect(card.hasText).toBe(false);
    expect(card.hasAudio).toBe(false);
  });

  it('поля, которых ручка не отдаёт, заполняются пусто, а не выдумываются', () => {
    const card = toBookCardModelFromAuthorBook(authorBook());

    expect(card.ratingsCount).toBe(0);
    expect(card.publishedAt).toBeNull();
    expect(card.categoryIds).toEqual([]);
  });
});
