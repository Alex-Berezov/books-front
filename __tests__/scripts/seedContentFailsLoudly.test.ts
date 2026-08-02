import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * WP-10.7 (R2-05): скрипт сидирования молча сломан фазой 6 — `POST /books` отбивается 400,
 * ошибка проглатывалась, и скрипт печатал «Seeding completed successfully», не создав
 * ни одной книги. Трассировка: запуск скрипта → ненулевой выход и внятное объяснение.
 */

const jsonResponse = (body: unknown, status = 200): Response =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  }) as Response;

const runScript = async () => {
  vi.resetModules();
  await import('@/scripts/seed-content');
};

describe('seed-content script (WP-10.7 / R2-05)', () => {
  let exitSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    // Бэкенд фазы 6: прямое создание книги отключено, всё остальное отвечает как обычно.
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        if (url.endsWith('/auth/login')) {
          return jsonResponse({ accessToken: 'token' });
        }
        if (url.endsWith('/books') && init?.method === 'POST') {
          return jsonResponse(
            { message: 'Books must be created from an approved rights intake' },
            400
          );
        }
        return jsonResponse({ id: 'entity-1' });
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('exits non-zero instead of reporting a successful seeding run', async () => {
    await runScript();

    await vi.waitFor(() => expect(exitSpy).toHaveBeenCalledWith(1), { timeout: 10000 });

    const printed = logSpy.mock.calls.flat().join('\n');
    expect(printed).not.toContain('Seeding completed successfully');
  });

  it('explains that a book can only be created from an approved rights intake', async () => {
    await runScript();

    await vi.waitFor(() => expect(exitSpy).toHaveBeenCalledWith(1), { timeout: 10000 });

    const reported = errorSpy.mock.calls.flat().map(String).join('\n');
    expect(reported).toContain('direct book creation is disabled since phase 6');
    expect(reported).toContain('/admin/rights/intakes/:id/create-book');
  });
});
