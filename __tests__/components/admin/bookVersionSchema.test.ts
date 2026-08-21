import { describe, expect, it } from 'vitest';
import {
  buildBookVersionSchema,
  requiredContentFieldsFor,
} from '@/components/admin/books/BookForm/bookVersionSchema';
import type { BookFormData } from '@/components/admin/books/BookForm/BookForm.types';

/**
 * Кто попадает под запрет стирания. Правило одно на все статусы, и его переписывание
 * (`!== 'draft'` против `=== 'published'`) меняет поведение молча.
 */
describe('requiredContentFieldsFor', () => {
  it('ничего не требует при создании версии', () => {
    expect(requiredContentFieldsFor(undefined)).toEqual({
      description: false,
      coverImageUrl: false,
    });
  });

  it('ничего не требует от черновика', () => {
    expect(
      requiredContentFieldsFor({
        status: 'draft',
        description: '<p>Роман</p>',
        coverImageUrl: 'https://cdn.example.com/c.jpg',
      })
    ).toEqual({ description: false, coverImageUrl: false });
  });

  it('не даёт стереть заполненные поля опубликованной версии', () => {
    expect(
      requiredContentFieldsFor({
        status: 'published',
        description: '<p>Роман</p>',
        coverImageUrl: 'https://cdn.example.com/c.jpg',
      })
    ).toEqual({ description: true, coverImageUrl: true });
  });

  it('не требует того, чего в опубликованной версии и так нет', () => {
    expect(
      requiredContentFieldsFor({
        status: 'published',
        description: '   ',
        coverImageUrl: '',
      })
    ).toEqual({ description: false, coverImageUrl: false });
  });

  /** Описание — HTML из редактора: пустой абзац читателю виден как отсутствие текста. */
  it('считает пустой абзац пустым описанием', () => {
    expect(
      requiredContentFieldsFor({
        status: 'published',
        description: '<p>&nbsp;</p>',
        coverImageUrl: '',
      })
    ).toEqual({ description: false, coverImageUrl: false });
  });

  it('неизвестный статус попадает в строгую ветку, а не в разрешающую', () => {
    expect(
      requiredContentFieldsFor({
        description: '<p>Роман</p>',
        coverImageUrl: 'https://cdn.example.com/c.jpg',
      })
    ).toEqual({ description: true, coverImageUrl: true });
  });
});

const formData = (overrides: Partial<BookFormData> = {}): BookFormData =>
  ({
    bookSlug: 'bratya-karamazovy',
    language: 'ru',
    title: 'Братья Карамазовы',
    author: 'Фёдор Достоевский',
    description: '<p>Роман</p>',
    coverImageUrl: 'https://cdn.example.com/c.jpg',
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
    ...overrides,
  }) as BookFormData;

describe('buildBookVersionSchema', () => {
  it('пропускает пустые поля, когда ничего не требуется', () => {
    const schema = buildBookVersionSchema({ description: false, coverImageUrl: false });

    expect(schema.safeParse(formData({ description: '', coverImageUrl: '' })).success).toBe(true);
  });

  it('не даёт стереть обложку, когда она требуется', () => {
    const schema = buildBookVersionSchema({ description: false, coverImageUrl: true });

    const cleared = schema.safeParse(formData({ coverImageUrl: '' }));
    expect(cleared.success).toBe(false);
    expect(cleared.error?.issues.map((issue) => issue.path[0])).toContain('coverImageUrl');
    expect(schema.safeParse(formData()).success).toBe(true);
  });

  it('не даёт стереть описание, когда оно требуется', () => {
    const schema = buildBookVersionSchema({ description: true, coverImageUrl: false });

    const cleared = schema.safeParse(formData({ description: '<p></p>' }));
    expect(cleared.success).toBe(false);
    expect(cleared.error?.issues.map((issue) => issue.path[0])).toContain('description');
    expect(schema.safeParse(formData()).success).toBe(true);
  });
});
