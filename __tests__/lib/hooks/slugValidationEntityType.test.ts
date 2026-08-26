import { beforeEach, describe, expect, it, vi } from 'vitest';
import { checkTagSlugUniqueness } from '@/api/endpoints/slug-validation';

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

  it('does not block the form when the check itself fails', async () => {
    // Настоящую уникальность стережёт уникальный индекс в базе; отказ проверки не
    // должен мешать редактору сохранить запись.
    mocks.httpGetAuth.mockRejectedValue(new Error('network'));

    await expect(checkTagSlugUniqueness('any')).resolves.toMatchObject({ isUnique: true });
  });
});
