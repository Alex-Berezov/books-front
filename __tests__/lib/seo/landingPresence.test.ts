// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { loadLandingPresence } from '@/lib/seo/landing-presence';

/**
 * Общее правило карты сайта и `/llms.txt`: лендинг выпадает, только когда известно, что он пуст.
 * Прежний `?? 0` прятал все три лендинга на всех языках, стоило API моргнуть во время обхода.
 */
const getBookCards = vi.fn();
vi.mock('@/api/endpoints/public', () => ({
  getBookCards: (...args: unknown[]) => getBookCards(...args) as unknown,
}));

describe('loadLandingPresence', () => {
  beforeEach(() => {
    getBookCards.mockReset();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('известный ноль убирает лендинг, положительный счёт оставляет', async () => {
    getBookCards.mockImplementation(
      async (_l: string, _p: number, _s: number, params: { sort?: string }) => ({
        items: [],
        pagination: { total: params.sort === 'popular' ? 0 : 2 },
      })
    );
    const has = await loadLandingPresence('test');
    expect(has('en', 'popular')).toBe(false);
    expect(has('en', 'new')).toBe(true);
    expect(has('en', 'audiobooks')).toBe(true);
  });

  it('ответ без total и отказ запроса считаются «неизвестно» и лендинг оставляют', async () => {
    getBookCards.mockImplementation(async (lang: string) => {
      if (lang === 'ru') throw new Error('upstream down');
      return { items: [] };
    });
    const has = await loadLandingPresence('test');
    for (const key of ['audiobooks', 'popular', 'new'] as const) {
      expect(has('ru', key)).toBe(true);
      expect(has('en', key)).toBe(true);
    }
    expect(console.error).toHaveBeenCalled();
  });
});
