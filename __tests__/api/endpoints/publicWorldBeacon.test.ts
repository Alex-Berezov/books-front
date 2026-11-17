import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { sendWorldBeacon } from '@/api/endpoints/public-world-beacon';
import { BACKEND_PROXY_HEADER, BACKEND_PROXY_HEADER_VALUE } from '@/lib/backend-proxy.constants';

/**
 * F08-3b, `product.md` §14: событие счётчика мира книги уходит на собственный маршрут фронта
 * `/api/world/beacon` - POST JSON, `keepalive`, без кук, без кэша; отказ сети страницу не ломает.
 */

const fetchMock = vi.fn();

describe('sendWorldBeacon', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('POST на маршрут фронта: JSON, keepalive, credentials omit, no-store, свой заголовок', () => {
    sendWorldBeacon({ bookVersionId: 'ver-1', key: 'ophelia', event: 'to_reader' });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/world/beacon',
      expect.objectContaining({
        method: 'POST',
        keepalive: true,
        credentials: 'omit',
        cache: 'no-store',
      })
    );
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(init.body as string)).toEqual({
      bookVersionId: 'ver-1',
      key: 'ophelia',
      event: 'to_reader',
    });
    const headers = new Headers(init.headers);
    expect(headers.get('content-type')).toBe('application/json');
    expect(headers.get(BACKEND_PROXY_HEADER)).toBe(BACKEND_PROXY_HEADER_VALUE);
    expect(headers.has('authorization')).toBe(false);
  });

  it('отказ сети не бросает, и у отказа есть обработчик (не уходит необработанным)', async () => {
    // Необработанный отказ в этом окружении vitest не всплывает ни событием процесса, ни ошибкой
    // прогона (проверено: без `.catch` тест оставался зелёным), поэтому обработчик ловится прямо
    // на обещании: `.catch(fn)` и `.then(_, fn)` оба проходят через `then` с `onRejected`.
    const rejectionHandlers: unknown[] = [];
    class TrackedPromise<T> extends Promise<T> {
      override then<R1 = T, R2 = never>(
        onFulfilled?: ((value: T) => R1 | PromiseLike<R1>) | null,
        onRejected?: ((reason: unknown) => R2 | PromiseLike<R2>) | null
      ): Promise<R1 | R2> {
        if (onRejected) rejectionHandlers.push(onRejected);
        return super.then(onFulfilled, onRejected);
      }
    }
    const failure = new TrackedPromise<Response>((_resolve, reject) =>
      reject(new TypeError('network'))
    );
    // Голая функция, а не `vi.fn`: тот сам вешает `then` на возвращённое обещание (учёт
    // `settledResults`) и дал бы обработчик за код, который его не вешал.
    let calls = 0;
    vi.stubGlobal('fetch', () => {
      calls += 1;
      return failure;
    });

    expect(() => sendWorldBeacon({ bookVersionId: 'ver-1', event: 'view' })).not.toThrow();
    await vi.waitFor(() => expect(rejectionHandlers).toHaveLength(1));
    expect(calls).toBe(1);
  });

  it('синхронное исключение fetch не бросает', () => {
    fetchMock.mockImplementation(() => {
      throw new Error('boom');
    });

    expect(() => sendWorldBeacon({ bookVersionId: 'ver-1', event: 'view' })).not.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
