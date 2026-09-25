// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { bookVersionBaseSchema } from '@/components/admin/books/BookForm/bookVersionSchema';
import {
  buildCreateVersionRequest,
  buildImportVersionPayload,
  buildUpdateVersionRequest,
  buildVersionSeoPayload,
} from '@/components/admin/books/BookForm/buildVersionRequest';
import type { BookFormData } from '@/components/admin/books/BookForm/BookForm.types';

/**
 * Разница между «редактор очистил поле» и «редактор его не трогал» живёт целиком в этой
 * сборке: создание пустое поле не отправляет вовсе, правка отправляет пустой строкой.
 * Вернуть тут `|| undefined` — и очистка описания в черновике перестаёт работать молча:
 * запрос уходит, ответ 200, прежний текст возвращается после перезагрузки.
 */
const formData = (overrides: Partial<BookFormData> = {}): BookFormData =>
  ({
    bookSlug: 'bratya-karamazovy',
    language: 'ru',
    title: 'Братья Карамазовы',
    author: 'Фёдор Достоевский',
    description: '',
    coverImageUrl: '',
    type: 'text',
    isFree: true,
    referralUrl: '',
    primaryCategoryId: '',
    seoMetaTitle: '',
    seoMetaDescription: '',
    seoCanonicalUrl: '',
    seoRobots: 'index, follow',
    seoOgTitle: '',
    seoOgDescription: '',
    seoOgImageUrl: '',
    seoTwitterCard: 'summary',
    firstPublishedYear: '',
    editionPublishedYear: '',
    originalLanguage: '',
    copyrightStatus: '',
    authorPageUrl: '',
    authorId: '',
    characters: [],
    quotes: [],
    faq: [],
    themes: [],
    originalTitle: '',
    alternativeTitles: [],
    shortDescription: '',
    summaryShort: '',
    symbols: [],
    coverAlt: '',
    seoOgImageAlt: '',
    ...overrides,
  }) as BookFormData;

describe('buildCreateVersionRequest', () => {
  it('не отправляет незаполненные описание и обложку', () => {
    const request = buildCreateVersionRequest(formData());

    expect(request.description).toBeUndefined();
    expect(request.coverImageUrl).toBeUndefined();
    expect(request.title).toBe('Братья Карамазовы');
    expect(request.language).toBe('ru');
  });

  it('отправляет заполненные поля как есть', () => {
    const request = buildCreateVersionRequest(
      formData({ description: '<p>Роман</p>', coverImageUrl: 'https://cdn.example.com/c.jpg' })
    );

    expect(request.description).toBe('<p>Роман</p>');
    expect(request.coverImageUrl).toBe('https://cdn.example.com/c.jpg');
  });

  it('переводит годы в числа, а пустые — в null', () => {
    expect(buildCreateVersionRequest(formData()).firstPublishedYear).toBeNull();
    expect(
      buildCreateVersionRequest(formData({ firstPublishedYear: 1880 })).firstPublishedYear
    ).toBe(1880);
  });
});

describe('buildUpdateVersionRequest', () => {
  it('отправляет пустое поле пустой строкой — иначе очистить его нельзя', () => {
    const request = buildUpdateVersionRequest(formData());

    expect(request.description).toBe('');
    expect(request.coverImageUrl).toBe('');
    expect(request.slug).toBe('bratya-karamazovy');
  });

  it('отправляет заполненные поля как есть', () => {
    const request = buildUpdateVersionRequest(
      formData({ description: '<p>Роман</p>', coverImageUrl: 'https://cdn.example.com/c.jpg' })
    );

    expect(request.description).toBe('<p>Роман</p>');
    expect(request.coverImageUrl).toBe('https://cdn.example.com/c.jpg');
  });
});

describe('buildVersionSeoPayload', () => {
  it('пустой, когда ни одно SEO-поле не заполнено, кроме robots по умолчанию', () => {
    expect(buildVersionSeoPayload(formData({ seoRobots: '', seoTwitterCard: '' }))).toEqual({});
  });

  it('собирает только заполненные поля', () => {
    expect(
      buildVersionSeoPayload(
        formData({ seoMetaTitle: 'Заголовок', seoRobots: '', seoTwitterCard: '' })
      )
    ).toEqual({ metaTitle: 'Заголовок' });
  });

  /** Сборка одна на создание и на правку: выпавшее поле ломает сразу оба пути. */
  it('переносит все девять полей под именами ручки SEO', () => {
    expect(
      buildVersionSeoPayload(
        formData({
          seoMetaTitle: 'Мета-заголовок',
          seoMetaDescription: 'Мета-описание',
          seoCanonicalUrl: 'https://bibliaris.com/ru/book/x',
          seoRobots: 'index, follow',
          seoOgTitle: 'OG-заголовок',
          seoOgDescription: 'OG-описание',
          seoOgImageUrl: 'https://cdn.example.com/og.jpg',
          seoTwitterCard: 'summary_large_image',
          seoOgImageAlt: 'Обложка',
        })
      )
    ).toEqual({
      metaTitle: 'Мета-заголовок',
      metaDescription: 'Мета-описание',
      canonicalUrl: 'https://bibliaris.com/ru/book/x',
      robots: 'index, follow',
      ogTitle: 'OG-заголовок',
      ogDescription: 'OG-описание',
      ogImageUrl: 'https://cdn.example.com/og.jpg',
      twitterCard: 'summary_large_image',
      ogImageAlt: 'Обложка',
    });
  });
});

describe('buildCommonFields через оба сборщика', () => {
  it('пустые списки уходят как null, непустые — как есть', () => {
    const empty = buildUpdateVersionRequest(formData());
    expect(empty.themes).toBeNull();
    expect(empty.characters).toBeNull();
    expect(empty.quotes).toBeNull();
    expect(empty.faq).toBeNull();
    expect(empty.symbols).toBeNull();
    expect(empty.alternativeTitles).toBeNull();

    const filled = buildCreateVersionRequest(
      formData({
        themes: ['Мораль'],
        characters: [{ name: 'Иван', description: 'Брат' }],
        quotes: [{ text: 'Цитата', author: 'Автор' }],
        faq: [{ question: 'Вопрос', answer: 'Ответ' }],
        symbols: [{ title: 'Символ', description: 'Смысл' }],
        alternativeTitles: ['Другое название'],
      })
    );
    expect(filled.themes).toEqual(['Мораль']);
    expect(filled.characters).toEqual([{ name: 'Иван', description: 'Брат' }]);
    expect(filled.quotes).toEqual([{ text: 'Цитата', author: 'Автор' }]);
    expect(filled.faq).toEqual([{ question: 'Вопрос', answer: 'Ответ' }]);
    expect(filled.symbols).toEqual([{ title: 'Символ', description: 'Смысл' }]);
    expect(filled.alternativeTitles).toEqual(['Другое название']);
  });
});

/**
 * Импорт идёт циклом по пяти языкам, и часть версий книги может быть уже опубликована.
 * Пустая строка в таком теле означала бы стирание живого описания у опубликованной соседки:
 * бэкенд ответил бы 400, и цикл оборвался бы, оставив часть языков обновлёнными.
 */
describe('buildImportVersionPayload', () => {
  const version = {
    title: 'Братья Карамазовы',
    author: 'Фёдор Достоевский',
    description: '',
    coverImageUrl: '',
    copyrightStatus: null,
  };

  it('не отправляет описание и обложку, когда их нет ни в переводе, ни в версии', () => {
    const payload = buildImportVersionPayload({}, version);

    expect(payload.description).toBeUndefined();
    expect(payload.coverImageUrl).toBeUndefined();
    expect(payload.title).toBe('Братья Карамазовы');
  });

  it('берёт значения перевода, а при их отсутствии — значения версии', () => {
    const payload = buildImportVersionPayload(
      { localizedTitle: 'The Brothers Karamazov', shortDescription: 'Novel' },
      { ...version, coverImageUrl: 'https://cdn.example.com/c.jpg' }
    );

    expect(payload.title).toBe('The Brothers Karamazov');
    expect(payload.description).toBe('Novel');
    expect(payload.coverImageUrl).toBe('https://cdn.example.com/c.jpg');
  });
});

/**
 * `LEGACY-402`: бэкенд отбивает 400 элемент Json-массива с лишним ключом или без обязательной
 * строки. Импорт из внешнего JSON обязан пересобрать элементы, иначе 400 обрывает цикл по языкам
 * посередине; правка формы — пройти через схему формы, которая срезает лишнее.
 */
describe('форма элементов Json-массивов на выходе (LEGACY-402)', () => {
  const version = {
    title: 'T',
    author: 'A',
    description: '',
    coverImageUrl: '',
    copyrightStatus: null,
  };

  it('импорт срезает лишние ключи у годных элементов', () => {
    const payload = buildImportVersionPayload(
      {
        characters: [{ name: 'Dorian', description: 'Main', role: 'hero' }] as never,
        quotes: [{ text: 'Q', author: 'W', source: 'ch. 1' }, { text: 'Only text' }] as never,
        symbols: [{ title: 'Portrait', description: 'Soul', extra: 1 }] as never,
        faq: [{ question: 'Q', answer: 'A', id: 'x' }] as never,
      },
      version
    );

    expect(payload.characters).toEqual([{ name: 'Dorian', description: 'Main' }]);
    expect(payload.quotes).toEqual([{ text: 'Q', author: 'W' }, { text: 'Only text' }]);
    expect(payload.symbols).toEqual([{ title: 'Portrait', description: 'Soul' }]);
    expect(payload.faq).toEqual([{ question: 'Q', answer: 'A' }]);
  });

  // `null` на правке — это `Prisma.DbNull` на бэкенде: стёр бы заполненный список версии.
  it('негодный элемент или не-массив не трогают колонку: поле не отправляется', () => {
    const payload = buildImportVersionPayload(
      {
        characters: [{ name: 'Dorian', description: 'Main' }, { name: 'Basil' }] as never,
        faq: [{ question: 'Q', answer: 'A' }, null] as never,
        quotes: { text: 'Q' } as never,
      },
      version
    );

    expect(payload.characters).toBeUndefined();
    expect(payload.faq).toBeUndefined();
    expect(payload.quotes).toBeUndefined();
  });

  it('null в необязательном поле не выбрасывает элемент', () => {
    const payload = buildImportVersionPayload(
      { quotes: [{ text: 'Q', author: null }] as never },
      version
    );

    expect(payload.quotes).toEqual([{ text: 'Q' }]);
  });

  it('нет поля или пустой список — null, как до правки', () => {
    const payload = buildImportVersionPayload({ characters: [] }, version);

    expect(payload.characters).toBeNull();
    expect(payload.symbols).toBeNull();
  });
});

/** Путь формы защищён не сборщиком, а zod-схемой формы: она срезает лишние ключи до отправки. */
describe('форма версии: элементы Json-массивов уходят только с полями DTO', () => {
  it('ключи сверх схемы (в том числе id от useFieldArray) не доходят до тела правки', () => {
    const parsed = bookVersionBaseSchema.partial().parse({
      characters: [{ id: 'rhf-1', name: 'Dorian', description: 'Main', role: 'hero' }],
      quotes: [{ id: 'rhf-2', text: 'Q', author: '' }],
      symbols: [{ id: 'rhf-3', title: 'Portrait', description: 'Soul' }],
      faq: [{ id: 'rhf-4', question: 'Q', answer: 'A' }],
    });
    const request = buildUpdateVersionRequest(formData(parsed as Partial<BookFormData>));

    expect(request.characters).toEqual([{ name: 'Dorian', description: 'Main' }]);
    expect(request.quotes).toEqual([{ text: 'Q', author: '' }]);
    expect(request.symbols).toEqual([{ title: 'Portrait', description: 'Soul' }]);
    expect(request.faq).toEqual([{ question: 'Q', answer: 'A' }]);
  });
});
