import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  checkBookVersionSlugUniqueness,
  checkTagSlugUniqueness,
} from '@/api/endpoints/slug-validation';

const mocks = vi.hoisted(() => ({ httpGetAuth: vi.fn() }));

vi.mock('@/lib/http-client', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@/lib/http-client');
  return { ...actual, httpGetAuth: mocks.httpGetAuth };
});

/**
 * LEGACY-061. `TagModal` передавал `entityType="book" // Fallback` — то есть проверял
 * слаг тега **по книгам**: отвечал на другой вопрос и молчал о совпадениях с другими
 * тегами. Своей проверки у тегов до 09.08.2026 не существовало вовсе.
 *
 * Тег и категория — разные пространства слагов и могут законно называться одинаково,
 * поэтому проверка отдельная, а не общая с категориями.
 */
describe('checkTagSlugUniqueness', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('asks the tags endpoint, not books or categories', async () => {
    mocks.httpGetAuth.mockResolvedValue({ exists: false });

    const result = await checkTagSlugUniqueness('aestheticism');

    const endpoint = mocks.httpGetAuth.mock.calls[0][0] as string;
    expect(endpoint).toContain('/tags/check-slug');
    expect(endpoint).toContain('slug=aestheticism');
    expect(result.isUnique).toBe(true);
  });

  // 🔴 Смысл LEGACY-061: без `excludeId` запись сравнивается сама с собой и форма
  // сообщает «занят» на собственном слаге редактируемого тега.
  it('excludes the record being edited', async () => {
    mocks.httpGetAuth.mockResolvedValue({ exists: false });

    await checkTagSlugUniqueness('aestheticism', 'tag-1');

    expect(mocks.httpGetAuth.mock.calls[0][0] as string).toContain('excludeId=tag-1');
  });

  it('reports a taken slug together with the suggestion', async () => {
    mocks.httpGetAuth.mockResolvedValue({ exists: true, suggestedSlug: 'aestheticism-2' });

    const result = await checkTagSlugUniqueness('aestheticism');

    expect(result.isUnique).toBe(false);
    expect(result.suggestedSlug).toBe('aestheticism-2');
  });

  // Поведение при отказе самой проверки (LEGACY-142) закреплено вместе с тремя
  // остальными функциями того же модуля - `__tests__/api/endpoints/slugValidationCheckFailed.test.ts`.
  // Здесь только маршрутизация по типу сущности, ради которой файл и заведён.
});

/**
 * Слаг языковой версии проверяется так, как разрешается публичный адрес, и ручке нужна своя
 * книга: при правке - через саму версию, при создании - id книги. Без языка ручка ответила бы
 * про `Book.slug` - это другой вопрос, им проверяется создание книги.
 */
describe('checkBookVersionSlugUniqueness', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('editing: sends the language and the edited version', async () => {
    mocks.httpGetAuth.mockResolvedValue({ exists: false });

    const result = await checkBookVersionSlugUniqueness('voyna-i-mir', 'ru', {
      versionId: 'version-1',
    });

    const endpoint = mocks.httpGetAuth.mock.calls[0][0] as string;
    expect(endpoint).toContain('/books/check-slug');
    expect(endpoint).toContain('slug=voyna-i-mir');
    expect(endpoint).toContain('lang=ru');
    expect(endpoint).toContain('excludeVersionId=version-1');
    expect(endpoint).not.toContain('excludeId=');
    expect(result.isUnique).toBe(true);
  });

  it('creating: sends the own book, and no version', async () => {
    mocks.httpGetAuth.mockResolvedValue({ exists: false });

    await checkBookVersionSlugUniqueness('voyna-i-mir', 'ru', { bookId: 'book-1' });

    const endpoint = mocks.httpGetAuth.mock.calls[0][0] as string;
    expect(endpoint).toContain('excludeId=book-1');
    expect(endpoint).not.toContain('excludeVersionId');
  });

  it('reports a taken slug together with the suggestion and the conflicting book', async () => {
    mocks.httpGetAuth.mockResolvedValue({
      exists: true,
      suggestedSlug: 'voyna-i-mir-2',
      existingBook: { id: 'book-2', slug: 'voyna-i-mir' },
    });

    const result = await checkBookVersionSlugUniqueness('voyna-i-mir', 'ru');

    expect(result.isUnique).toBe(false);
    expect(result.suggestedSlug).toBe('voyna-i-mir-2');
    expect(result.existingBook).toEqual({ id: 'book-2', slug: 'voyna-i-mir' });
  });
});
