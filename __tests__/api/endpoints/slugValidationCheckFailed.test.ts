import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  checkBookSlugUniqueness,
  checkCategorySlugUniqueness,
  checkPageSlugUniqueness,
  checkTagSlugUniqueness,
} from '@/api/endpoints/slug-validation';

const mocks = vi.hoisted(() => ({ httpGetAuth: vi.fn() }));

vi.mock('@/lib/http-client', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@/lib/http-client');
  return { ...actual, httpGetAuth: mocks.httpGetAuth };
});

/**
 * LEGACY-142. Отказ проверки уникальности (401/403/сеть) раньше выдавался за
 * подтверждённую уникальность (`isUnique: true`) во всех четырёх функциях
 * `slug-validation.ts`. Все четыре закреплены здесь, в зеркале своего модуля:
 * отказ обязан остаться неизвестностью, а не превращаться в зелёный ответ.
 */
describe('slug-validation endpoints report a failed check as unknown, not unique', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('checkPageSlugUniqueness', async () => {
    mocks.httpGetAuth.mockRejectedValue(new Error('network'));

    const result = await checkPageSlugUniqueness('about-us', 'en');

    expect(result.isUnique).not.toBe(true);
    expect(result.checkFailed).toBe(true);
  });

  it('checkBookSlugUniqueness', async () => {
    mocks.httpGetAuth.mockRejectedValue(new Error('network'));

    const result = await checkBookSlugUniqueness('harry-potter');

    expect(result.isUnique).not.toBe(true);
    expect(result.checkFailed).toBe(true);
  });

  it('checkCategorySlugUniqueness', async () => {
    mocks.httpGetAuth.mockRejectedValue(new Error('network'));

    const result = await checkCategorySlugUniqueness('fiction');

    expect(result.isUnique).not.toBe(true);
    expect(result.checkFailed).toBe(true);
  });

  it('checkTagSlugUniqueness', async () => {
    mocks.httpGetAuth.mockRejectedValue(new Error('network'));

    const result = await checkTagSlugUniqueness('aestheticism');

    expect(result.isUnique).not.toBe(true);
    expect(result.checkFailed).toBe(true);
  });
});
