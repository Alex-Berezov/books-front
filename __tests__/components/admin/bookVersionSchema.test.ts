// @vitest-environment node
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

// `LEGACY-437`: формат слага в форме — тот же, что у DTO версии (`SLUG_PATTERN`, длина 100);
// иначе форма пропускает то, на что сервер ответит 400 без подсказки у поля.
describe('buildBookVersionSchema: формат слага (LEGACY-437)', () => {
  const schema = buildBookVersionSchema({ description: false, coverImageUrl: false });
  const slugIssues = (bookSlug: string) =>
    schema
      .safeParse(formData({ bookSlug }))
      .error?.issues.filter((issue) => issue.path[0] === 'bookSlug') ?? [];

  it.each(['-hamlet', 'hamlet-', 'ham--let', 'Hamlet', 'ham let', 'a'.repeat(101)])(
    'отбивает %s',
    (bookSlug) => {
      expect(slugIssues(bookSlug)).not.toEqual([]);
    }
  );

  it('нетронутый старый слаг не по формату не запирает сохранение; изменённый — проверяется', () => {
    const editing = buildBookVersionSchema(
      { description: false, coverImageUrl: false },
      'old--slug'
    );
    const issues = (bookSlug: string) =>
      editing
        .safeParse(formData({ bookSlug }))
        .error?.issues.filter((issue) => issue.path[0] === 'bookSlug') ?? [];

    expect(issues('old--slug')).toEqual([]);
    // Длина — тоже только у изменённого: `Book.slug` длиннее 100 бэкенд не запрещал.
    const longKept = 'a'.repeat(101);
    const editingLong = buildBookVersionSchema(
      { description: false, coverImageUrl: false },
      longKept
    );
    expect(
      editingLong
        .safeParse(formData({ bookSlug: longKept }))
        .error?.issues.filter((issue) => issue.path[0] === 'bookSlug') ?? []
    ).toEqual([]);
    expect(issues('a'.repeat(101))).not.toEqual([]);
    expect(issues('new--slug')).not.toEqual([]);
    expect(issues('new-slug')).toEqual([]);
  });

  it.each(['hamlet', 'hamlet-2', 'bratya-karamazovy', 'a'.repeat(100)])(
    'пускает %s',
    (bookSlug) => {
      expect(slugIssues(bookSlug)).toEqual([]);
    }
  );
});

// `T75`: форма версии — зеркало `@IsAbsoluteHttpUrl()` на `coverImageUrl`/`referralUrl` и
// `UpdateSeoDto` на SEO-адресах; `z.url()` пропускал `ftp://`, а голая строка — что угодно.
describe('buildBookVersionSchema: адреса (LEGACY-401, T75)', () => {
  const schema = buildBookVersionSchema({ description: false, coverImageUrl: false });

  it.each(['coverImageUrl', 'referralUrl', 'seoCanonicalUrl', 'seoOgImageUrl'] as const)(
    '%s отбивает ftp и адрес без схемы, пускает пусто и https',
    (field) => {
      for (const bad of ['ftp://cdn.example.com/c.jpg', 'cdn.example.com/c.jpg']) {
        const result = schema.safeParse(formData({ [field]: bad }));
        expect(result.error?.issues.map((issue) => issue.path[0])).toContain(field);
      }
      expect(schema.safeParse(formData({ [field]: '' })).success).toBe(true);
      expect(schema.safeParse(formData({ [field]: 'https://cdn.example.com/c.jpg' })).success).toBe(
        true
      );
    }
  );
});
