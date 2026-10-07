// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { buildCategorySchema } from '@/components/admin/categories/CategoryModal/CategoryModal.types';
import { buildTranslationSchema as buildCategoryTranslationSchema } from '@/components/admin/categories/CategoryTranslationsModal/CategoryTranslationsModal.types';
import { buildPageSchema } from '@/components/admin/pages/PageForm/PageForm.types';
import { buildTagSchema } from '@/components/admin/tags/TagModal/TagModal.types';
import { buildTranslationSchema as buildTagTranslationSchema } from '@/components/admin/tags/TagTranslationsModal/TagTranslationsModal.types';
import { SLUG_MAX_LENGTH } from '@/lib/utils/slug';

/**
 * Предел длины слага в формах админки — зеркало бэкенда (`LEGACY-437`): на создании всегда,
 * на правке только у изменённого слага. Неизменный старый слаг длиннее предела сервер
 * пропускает, и форма не должна запирать сохранение остальных полей такой записи.
 */
const slugOf = (length: number, char = 'a') => char.repeat(length);

describe.each([
  ['категория', buildCategorySchema],
  ['перевод категории', buildCategoryTranslationSchema],
  ['тег', buildTagSchema],
  ['перевод тега', buildTagTranslationSchema],
  ['страница', buildPageSchema],
])('%s: предел длины слага', (_name, build) => {
  const parseSlug = (slug: string, keptSlug?: string) => build(keptSlug).shape.slug.safeParse(slug);

  it('новый слаг длиннее предела отбит с понятной ошибкой', () => {
    const result = parseSlug(slugOf(SLUG_MAX_LENGTH + 1));
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.message)).toContain('Slug is too long');
  });

  it('новый слаг ровно в предел проходит', () => {
    expect(parseSlug(slugOf(SLUG_MAX_LENGTH)).success).toBe(true);
  });

  it('неизменный старый слаг длиннее предела проходит', () => {
    const longSlug = slugOf(SLUG_MAX_LENGTH + 1);
    expect(parseSlug(longSlug, longSlug).success).toBe(true);
  });

  it('изменённый слаг длиннее предела на правке отбит', () => {
    const result = parseSlug(slugOf(SLUG_MAX_LENGTH + 1, 'b'), slugOf(SLUG_MAX_LENGTH + 1));
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.message)).toContain('Slug is too long');
  });
});
