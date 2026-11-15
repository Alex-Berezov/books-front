import { beforeEach, describe, expect, it, vi } from 'vitest';

// Сбой загрузки чанка проверок мира книги не запоминается: следующий вызов грузит модуль заново.
// Каждый тест начинает с чистого модуля и чистого счёта: порядок тестов роли не играет.

const { state } = vi.hoisted(() => ({ state: { fail: false, loads: 0 } }));

// Мок модуля проверок регистрируется заново в каждом тесте (`vi.doMock`): удачная загрузка
// одного теста не остаётся в реестре для другого.
const factory = () => {
  state.loads += 1;
  if (state.fail) throw new Error('chunk load failed');
  return { marker: 'loaded' };
};

const load = async () =>
  (await import('@/lib/admin/load-book-world-validation')).loadBookWorldValidation;

describe('loadBookWorldValidation', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.doUnmock('@/lib/admin/book-world-validation');
    vi.doMock('@/lib/admin/book-world-validation', factory);
    state.fail = false;
    state.loads = 0;
  });

  it('после отказа следующий вызов грузит модуль заново', async () => {
    state.fail = true;
    const loadBookWorldValidation = await load();
    await expect(loadBookWorldValidation()).rejects.toThrow();
    state.fail = false;
    vi.resetModules();
    await expect(loadBookWorldValidation()).resolves.toMatchObject({ marker: 'loaded' });
    expect(state.loads).toBe(2);
  });

  it('один промис на сессию: параллельные вызовы ждут одну и ту же загрузку', async () => {
    const loadBookWorldValidation = await load();
    const first = loadBookWorldValidation();
    expect(loadBookWorldValidation()).toBe(first);
    await expect(first).resolves.toMatchObject({ marker: 'loaded' });
    expect(state.loads).toBe(1);
  });
});
