import { describe, expect, it, vi } from 'vitest';

// Сбой загрузки чанка проверок не запоминается: следующий вызов грузит модуль заново.

const { state } = vi.hoisted(() => ({ state: { fail: true, loads: 0 } }));

vi.mock('@/lib/admin/author-validation', () => {
  state.loads += 1;
  if (state.fail) throw new Error('chunk load failed');
  return { marker: 'loaded' };
});

describe('loadAuthorValidation', () => {
  it('после отказа следующий вызов грузит модуль заново', async () => {
    const { loadAuthorValidation } = await import('@/lib/admin/load-author-validation');

    await expect(loadAuthorValidation()).rejects.toThrow();
    state.fail = false;
    vi.resetModules();

    await expect(loadAuthorValidation()).resolves.toMatchObject({ marker: 'loaded' });
    expect(state.loads).toBe(2);
  });
});
