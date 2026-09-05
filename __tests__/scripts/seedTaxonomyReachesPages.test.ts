import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * LEGACY-040: до разделения на два скрипта `createBook` бросал `Error` внутри общего
 * `main()`, и внешний `catch` останавливал сид на первой книге — секция CMS-страниц
 * (`about-us`, `terms-of-service`) не отрабатывала никогда, хотя книги в принципе
 * не могли быть созданы (см. `seedBooksFailsLoudly.test.ts`).
 *
 * `seed-taxonomy.ts` не знает о книгах вовсе. Здесь проверяются три вещи: скрипт доходит
 * до создания обеих страниц и завершается без `process.exit(1)`; `fetch` ни разу не зовёт
 * `/books`; отказ бэкенда больше не выдаётся за успех (находка ревью — до починки скрипт
 * печатал «Seeding completed successfully» и выходил нулём, даже не создав ничего).
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
  await import('@/scripts/seed-taxonomy');
};

describe('seed-taxonomy script (LEGACY-040)', () => {
  let exitSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;
  let logSpy: ReturnType<typeof vi.spyOn>;
  let fetchMock: ReturnType<typeof vi.fn>;

  const stubFetch = (impl: (url: string, init?: RequestInit) => Promise<Response>) => {
    fetchMock = vi.fn(impl);
    vi.stubGlobal('fetch', fetchMock);
  };

  beforeEach(() => {
    exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    stubFetch(async (url) => {
      if (url.endsWith('/auth/login')) {
        return jsonResponse({ accessToken: 'token' });
      }
      return jsonResponse({ id: 'entity-1' });
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('reaches the CMS pages section and exits successfully', async () => {
    await runScript();

    await vi.waitFor(
      () => {
        const printed = logSpy.mock.calls.flat().join('\n');
        expect(printed).toContain('Seeding completed successfully');
      },
      { timeout: 2000 }
    );

    expect(exitSpy).not.toHaveBeenCalledWith(1);

    const printed = logSpy.mock.calls.flat().join('\n');
    expect(printed).toContain("Page 'About Us' created");
    expect(printed).toContain("Page 'Terms of Service' created");
  });

  it('never touches the disabled direct book-creation endpoint', async () => {
    await runScript();

    await vi.waitFor(
      () => {
        const printed = logSpy.mock.calls.flat().join('\n');
        expect(printed).toContain('Seeding completed successfully');
      },
      { timeout: 2000 }
    );

    const calledUrls = fetchMock.mock.calls.map((call) => String(call[0]));
    expect(calledUrls.some((url) => url.endsWith('/books'))).toBe(false);
  });

  /**
   * 🔴 Находка ревью, дефект внесён самим разделением: `createCategory`/`createTag`/
   * `createPage` глотают отказ и возвращают `null`, а до разделения молчаливый успех
   * маскировался общим `exit(1)` от книг. Теперь `yarn seed` — рабочая часть, и её код
   * возврата единственный сигнал. Возврат безусловного `console.log('...successfully')`
   * без счёта отказов красит этот тест.
   */
  it('exits non-zero when the API rejects a CMS page', async () => {
    stubFetch(async (url, init) => {
      if (url.endsWith('/auth/login')) {
        return jsonResponse({ accessToken: 'token' });
      }
      if (url.includes('/admin/en/pages') && init?.method === 'POST') {
        return jsonResponse({ message: 'Forbidden' }, 403);
      }
      return jsonResponse({ id: 'entity-1' });
    });

    await runScript();

    await vi.waitFor(() => expect(exitSpy).toHaveBeenCalledWith(1), { timeout: 2000 });

    const printed = logSpy.mock.calls.flat().join('\n');
    expect(printed).not.toContain('Seeding completed successfully');

    const reported = errorSpy.mock.calls.flat().map(String).join('\n');
    expect(reported).toContain('entities could not be created');
  });

  /**
   * Повторный прогон по уже засеянной базе — норма, а не отказ: бэкенд отвечает на занятый
   * слаг `400 ... already exists` (`books/src/modules/category/category.service.ts:277`).
   * Без этой ветки сид краснел бы на каждом втором запуске.
   */
  it('treats an already-seeded database as success', async () => {
    stubFetch(async (url) => {
      if (url.endsWith('/auth/login')) {
        return jsonResponse({ accessToken: 'token' });
      }
      return jsonResponse({ message: 'Category with same slug already exists' }, 400);
    });

    await runScript();

    await vi.waitFor(
      () => {
        const printed = logSpy.mock.calls.flat().join('\n');
        expect(printed).toContain('Seeding completed successfully');
      },
      { timeout: 2000 }
    );

    expect(exitSpy).not.toHaveBeenCalledWith(1);

    const printed = logSpy.mock.calls.flat().join('\n');
    expect(printed).toContain('already present: 8');
  });

  /**
   * 🔴 LEGACY-151. `request` возвращала `response.json()` из `try` без `await`, поэтому
   * отказ разбора тела уходил мимо соседнего `catch`: имя ручки в лог не попадало,
   * и падение выглядело как безымянный отказ где-то в скрипте. Правило
   * `@typescript-eslint/return-await` этот класс ловит, но `yarn lint` каталог
   * `scripts/` не обходил вовсе — дефект прожил в репозитории непроверенным.
   *
   * Кейс переехал сюда из `seedBooksFailsLoudly.test.ts`: `seed-books.ts` больше
   * не логинится вовсе, а `request` и `login` живут в `seed-shared.ts` и достижимы
   * отсюда — этот скрипт логинится по делу.
   */
  it('names the endpoint when the response body cannot be parsed', async () => {
    stubFetch(async (url) => {
      if (url.endsWith('/auth/login')) {
        return {
          ok: true,
          status: 200,
          json: async () => {
            throw new Error('Unexpected token < in JSON at position 0');
          },
          text: async () => '<html>502 Bad Gateway</html>',
        } as unknown as Response;
      }
      return jsonResponse({ id: 'entity-1' });
    });

    await runScript();

    await vi.waitFor(
      () => {
        const reported = errorSpy.mock.calls.flat().map(String).join('\n');
        expect(reported).toContain('Request failed: /auth/login');
        expect(reported).toContain('Unexpected token');
      },
      { timeout: 2000 }
    );
  });
});
