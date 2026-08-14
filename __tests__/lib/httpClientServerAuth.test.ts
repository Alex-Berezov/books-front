// @vitest-environment node

/**
 * LEGACY-140: `getCurrentSession` читает сессию только в браузере, поэтому
 * `http*Auth`, вызванный из серверного компонента, route handler или из кода
 * карты сайта, отдавал общий 401 ещё до похода в сеть. Такой 401 неотличим от
 * честного ответа бэкенда неавторизованному запросу: в карте сайта он оседал в
 * noteFailure и превращался в 503 или в пропавшую секцию.
 *
 * Окружение здесь **node**, а не jsdom: без этого `window` существует и
 * серверную ветку не проверить вовсе.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SERVER_CONTEXT_AUTH_ERROR, SERVER_CONTEXT_AUTH_MESSAGE } from '@/lib/http-client/auth';
import { httpGetAuth } from '@/lib/http-client/methods';
import { ApiError } from '@/types/api';
import type { MockInstance } from 'vitest';

vi.mock('next-auth/react', () => ({
  getSession: vi.fn(async () => null),
  signOut: vi.fn(async () => undefined),
}));

const jsonResponse = () =>
  new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });

describe('http*Auth в серверном контексте', () => {
  // ⚠️ Шпион ставится в beforeEach, а не в теле describe: msw подменяет
  // `globalThis.fetch` в своём beforeAll из setupTests.ts, и шпион, поставленный
  // раньше, оказывается под этой подменой — вызовы до него не доходят.
  let fetchSpy: MockInstance<typeof globalThis.fetch>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => jsonResponse());
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('в этом окружении window действительно нет', () => {
    // Сторож самой посадки: под jsdom все проверки ниже стали бы зелёными
    // по неверной причине.
    expect(typeof window).toBe('undefined');
  });

  it('бросает ошибку, называющую серверный контекст, и не ходит в сеть', async () => {
    const error = await httpGetAuth('/admin/whatever').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).message).toBe(SERVER_CONTEXT_AUTH_MESSAGE);
    expect((error as ApiError).message).toMatch(/server context/i);
    expect((error as ApiError).error).toBe(SERVER_CONTEXT_AUTH_ERROR);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('ошибка не выглядит как отказ авторизации: это неверный вызов, а не 401', async () => {
    const error = (await httpGetAuth('/admin/whatever').catch((e: unknown) => e)) as ApiError;

    expect(error.statusCode).not.toBe(401);
    expect(error.isUnauthorized()).toBe(false);
  });

  it('с requireAuth: false запрос по-прежнему уходит', async () => {
    // Обходной путь карты сайта: `getCategories` и `getTags` жёстко ставят этот
    // флаг, и снимать его нельзя, пока нет серверного способа получить токен.
    await expect(httpGetAuth('/categories', { requireAuth: false })).resolves.toEqual({ ok: true });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('с явно переданным токеном запрос уходит и токен доезжает', async () => {
    await httpGetAuth('/admin/whatever', { accessToken: 'server-token' });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const init = fetchSpy.mock.calls[0]?.[1];
    expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer server-token');
  });
});
