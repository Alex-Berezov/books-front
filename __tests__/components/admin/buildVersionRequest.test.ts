import { describe, expect, it } from 'vitest';
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
