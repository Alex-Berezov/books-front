import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * WP-10.7 (R2-05): скрипт сидирования молча сломан фазой 6 — `POST /books` отбивается 400,
 * ошибка проглатывалась, и скрипт печатал «Seeding completed successfully», не создав
 * ни одной книги. Трассировка: запуск скрипта → ненулевой выход и внятное объяснение.
 *
 * LEGACY-040: скрипт разделён на `seed-taxonomy.ts` (категории, теги, CMS-страницы —
 * рабочая часть) и `seed-books.ts` (документированный стоп, проверяемый здесь). Сети
 * этот скрипт не касается вовсе, поэтому `fetch` здесь глобально запрещён: любой поход
 * наружу означает возврат `login` и недостижимое объяснение при неподнятом бэкенде.
 */

const runScript = async () => {
  vi.resetModules();
  await import('@/scripts/seed-books');
};

describe('seed-books script (WP-10.7 / R2-05 / LEGACY-040)', () => {
  let exitSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;
  let logSpy: ReturnType<typeof vi.spyOn>;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    fetchMock = vi.fn(async () => {
      throw new Error('seed-books must not touch the network');
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('exits non-zero instead of reporting a successful seeding run', async () => {
    await runScript();

    await vi.waitFor(() => expect(exitSpy).toHaveBeenCalledWith(1), { timeout: 2000 });

    const printed = logSpy.mock.calls.flat().join('\n');
    expect(printed).not.toContain('Seeding completed successfully');
  });

  it('explains that a book can only be created from an approved rights intake', async () => {
    await runScript();

    await vi.waitFor(() => expect(exitSpy).toHaveBeenCalledWith(1), { timeout: 2000 });

    const reported = errorSpy.mock.calls.flat().map(String).join('\n');
    expect(reported).toContain('direct book creation is disabled since phase 6');
    expect(reported).toContain('/admin/rights/intakes/:id/create-book');
  });

  /**
   * 🔴 LEGACY-040, находка ревью: до починки скрипт звал `login()` перед стопом. При
   * неподнятом API или несовпавшем пароле прогон умирал в `login` с тем же кодом 1,
   * и объяснение про клиренс — единственный полезный выход скрипта — не печаталось ни разу.
   * Возврат `await login()` в `main()` красит этот тест: `fetch` бросает, до `createBook`
   * управление не доходит, текста про интейк в выводе нет.
   */
  it('prints the clearance explanation without touching the API at all', async () => {
    await runScript();

    await vi.waitFor(() => expect(exitSpy).toHaveBeenCalledWith(1), { timeout: 2000 });

    expect(fetchMock).not.toHaveBeenCalled();

    const reported = errorSpy.mock.calls.flat().map(String).join('\n');
    expect(reported).toContain('A book can only be created from an approved rights intake');
  });
});
