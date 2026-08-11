import { describe, expect, it } from 'vitest';
import { toBookCardModel, toBookCardModels } from '@/lib/mappers/book';
import type { BookOverview, VersionPreview } from '@/types/api-schema';

const version = (overrides: Partial<VersionPreview> = {}): VersionPreview => ({
  id: 'v-1',
  type: 'text',
  slug: 'version-slug',
  title: 'Version Title',
  author: 'Version Author',
  language: 'en',
  coverImageUrl: 'https://media.bibliaris.com/version.png',
  isFree: true,
  status: 'published',
  chaptersCount: 1,
  ...overrides,
});

const overview = (overrides: Partial<BookOverview> = {}): BookOverview => ({
  id: 'book-1',
  slug: 'book-slug',
  title: 'Book Title',
  author: 'Book Author',
  language: 'en',
  categories: [],
  tags: [],
  versions: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
  ...overrides,
});

/**
 * Совместимый маппер: страницы, которые ещё ходят за полным `overview`, лепят из
 * него карточку. Он весь состоит из цепочек фолбэков, и каждая из них — решение
 * «что показать, когда данных нет», а не украшение.
 */
describe('toBookCardModel — выбор версии', () => {
  it('предпочитает опубликованную версию запрошенного языка', () => {
    const card = toBookCardModel(
      overview({
        versions: [
          version({ id: 'v-en', language: 'en', title: 'English' }),
          version({ id: 'v-ru', language: 'ru', title: 'Русский' }),
        ],
      }),
      'ru'
    );

    expect(card.title).toBe('Русский');
  });

  it('берёт любую опубликованную, если версии на этом языке нет', () => {
    const card = toBookCardModel(
      overview({
        versions: [
          version({ id: 'v-draft', language: 'ru', status: 'draft', title: 'Черновик' }),
          version({ id: 'v-es', language: 'es', title: 'Español' }),
        ],
      }),
      'ru'
    );

    expect(card.title).toBe('Español');
  });

  // Крайний случай: опубликованных нет вовсе. Показать пустую карточку хуже, чем
  // показать то, что есть, — карточка всё равно ведёт на страницу книги.
  it('падает на первую версию, когда опубликованных нет', () => {
    const card = toBookCardModel(
      overview({
        versions: [version({ id: 'v-draft', status: 'draft', title: 'Единственная' })],
      }),
      'en'
    );

    expect(card.title).toBe('Единственная');
  });
});

describe('toBookCardModel — фолбэки полей', () => {
  it('берёт заголовок, автора и обложку с книги, когда версий нет', () => {
    const card = toBookCardModel(
      overview({ coverImageUrl: 'https://media.bibliaris.com/book.png' }),
      'en'
    );

    expect(card).toMatchObject({
      title: 'Book Title',
      author: 'Book Author',
      coverImageUrl: 'https://media.bibliaris.com/book.png',
      slug: 'book-slug',
    });
  });

  it('принимает алиас coverUrl — и у версии, и у книги', () => {
    const fromVersion = toBookCardModel(
      overview({
        versions: [
          version({ coverImageUrl: undefined, coverUrl: 'https://media.bibliaris.com/alias.png' }),
        ],
      }),
      'en'
    );
    const fromBook = toBookCardModel(
      overview({ coverUrl: 'https://media.bibliaris.com/book-alias.png' }),
      'en'
    );

    expect(fromVersion.coverImageUrl).toBe('https://media.bibliaris.com/alias.png');
    expect(fromBook.coverImageUrl).toBe('https://media.bibliaris.com/book-alias.png');
  });

  it('обложки нет нигде — null, а не пустая строка', () => {
    const card = toBookCardModel(overview(), 'en');

    expect(card.coverImageUrl).toBeNull();
  });

  it('слаг берётся с версии, а без него — с книги, и в последнюю очередь id', () => {
    expect(toBookCardModel(overview({ versions: [version({ slug: 'ru-slug' })] }), 'en').slug).toBe(
      'ru-slug'
    );
    expect(toBookCardModel(overview({ versions: [version({ slug: undefined })] }), 'en').slug).toBe(
      'book-slug'
    );
    expect(toBookCardModel(overview({ slug: '', versions: [] }), 'en').slug).toBe('book-1');
  });

  it('authorSlug строится из отображаемого имени, а без автора остаётся null', () => {
    expect(toBookCardModel(overview({ author: '  Bram   Stoker ' }), 'en').authorSlug).toBe(
      'bram-stoker'
    );
    expect(toBookCardModel(overview({ author: '', versions: [] }), 'en').authorSlug).toBeNull();
  });

  it('рейтинг без значения — null, а не 0: «нет оценок» ≠ «оценка ноль»', () => {
    expect(toBookCardModel(overview(), 'en').rating).toBeNull();
    expect(toBookCardModel(overview({ rating: 4.5 }), 'en').rating).toBe(4.5);
  });

  it('categoryIds собираются в том же порядке и переживают отсутствие категорий', () => {
    const card = toBookCardModel(
      overview({
        categories: [
          { id: 'c-1', slug: 'a', name: 'A', type: 'genre' },
          { id: 'c-2', slug: 'b', name: 'B', type: 'genre' },
        ] as BookOverview['categories'],
      }),
      'en'
    );

    expect(card.categoryIds).toEqual(['c-1', 'c-2']);
    expect(toBookCardModel(overview(), 'en').categoryIds).toEqual([]);
  });
});

describe('toBookCardModel — доступность текста и аудио', () => {
  it('считает по версиям запрошенного языка, а не по любым', () => {
    const card = toBookCardModel(
      overview({
        versions: [
          version({ id: 'v-en-text', language: 'en', type: 'text' }),
          version({ id: 'v-ru-audio', language: 'ru', type: 'audio' }),
        ],
      }),
      'en'
    );

    expect(card).toMatchObject({ hasText: true, hasAudio: false });
  });

  it('черновая аудиоверсия доступности не даёт', () => {
    const card = toBookCardModel(
      overview({
        versions: [version({ id: 'v-audio', type: 'audio', status: 'draft' })],
      }),
      'en'
    );

    expect(card.hasAudio).toBe(false);
  });

  /**
   * ⚠️ Флаги книги читаются, только когда `versions` нет вовсе: пустой массив —
   * это ответ «версий нет», и он весомее сводного флага. Проверка фиксирует
   * именно это поведение, потому что `??` здесь легко перепутать с `||`.
   */
  it('флаги книги используются лишь при отсутствии массива версий', () => {
    const withoutVersions = toBookCardModel(
      overview({ versions: undefined as unknown as VersionPreview[], hasText: true }),
      'en'
    );
    const withEmptyVersions = toBookCardModel(overview({ versions: [], hasText: true }), 'en');

    expect(withoutVersions.hasText).toBe(true);
    expect(withEmptyVersions.hasText).toBe(false);
  });
});

describe('toBookCardModels', () => {
  it('сохраняет порядок и применяет один и тот же язык ко всем книгам', () => {
    const cards = toBookCardModels(
      [
        overview({ id: 'b-1', versions: [version({ language: 'ru', title: 'Первая' })] }),
        overview({ id: 'b-2', versions: [version({ language: 'ru', title: 'Вторая' })] }),
      ],
      'ru'
    );

    expect(cards.map((c) => c.id)).toEqual(['b-1', 'b-2']);
    expect(cards.map((c) => c.title)).toEqual(['Первая', 'Вторая']);
  });

  it('пустой список отображается в пустой', () => {
    expect(toBookCardModels([], 'en')).toEqual([]);
  });
});
