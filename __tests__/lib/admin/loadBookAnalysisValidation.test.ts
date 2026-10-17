import { describe, expect, it, vi } from 'vitest';

// Сбой загрузки чанка проверок анализа не запоминается: следующий вызов грузит модуль заново.

const { state } = vi.hoisted(() => ({ state: { fail: true, loads: 0 } }));

vi.mock('@/lib/admin/book-analysis-validation', () => {
  state.loads += 1;
  if (state.fail) throw new Error('chunk load failed');
  return { marker: 'loaded' };
});

describe('loadBookAnalysisValidation', () => {
  it('после отказа следующий вызов грузит модуль заново', async () => {
    const { loadBookAnalysisValidation } =
      await import('@/lib/admin/load-book-analysis-validation');

    await expect(loadBookAnalysisValidation()).rejects.toThrow();
    state.fail = false;
    vi.resetModules();

    await expect(loadBookAnalysisValidation()).resolves.toMatchObject({ marker: 'loaded' });
    expect(state.loads).toBe(2);
  });

  it('один промис на сессию: параллельные вызовы ждут одну и ту же загрузку', async () => {
    vi.resetModules();
    state.fail = false;
    const { loadBookAnalysisValidation } =
      await import('@/lib/admin/load-book-analysis-validation');
    const first = loadBookAnalysisValidation();
    expect(loadBookAnalysisValidation()).toBe(first);
    await expect(first).resolves.toMatchObject({ marker: 'loaded' });
  });
});
