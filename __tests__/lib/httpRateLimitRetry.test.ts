// @vitest-environment node
/**
 * `LEGACY-411`: `next build` печёт главную на пять языков одним IP раннера и
 * упирается в глобальный лимитер бэкенда. Повтор на 429 живёт в `httpGet` и
 * включается только при сборке (`NEXT_PHASE=phase-production-build`): один раз,
 * после полного `Retry-After` лимитера (60 с) и со своим `signal`, иначе склейка
 * `fetch` в Next отдала бы повтору тот же 429 из памяти.
 */
import { http, HttpResponse } from 'msw';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { httpGet } from '@/lib/http';
import { ApiError } from '@/types/api';
import { server } from '../msw/server';

const URL_BASE = 'http://localhost:5000/api';
const RATE_LIMITED = { status: 429, headers: { 'Retry-After': '60' } };

const useLimiter = (path: string, answers: Array<'429' | '429-no-header' | 'ok'>) => {
  const state = { calls: 0 };
  server.use(
    http.get(`${URL_BASE}${path}`, () => {
      const answer = answers[Math.min(state.calls, answers.length - 1)];
      state.calls += 1;
      if (answer === 'ok') return HttpResponse.json({ ok: true });
      if (answer === '429-no-header') {
        return HttpResponse.json({ message: 'too many requests' }, { status: 429 });
      }
      return HttpResponse.json({ message: 'too many requests' }, RATE_LIMITED);
    })
  );
  return state;
};

/** Двигать часы можно только после того, как пауза перед повтором встала таймером. */
const untilRetryIsScheduled = async (state: { calls: number }) => {
  await vi.waitFor(() => expect(state.calls).toBe(1));
  await vi.waitFor(() => expect(vi.getTimerCount()).toBeGreaterThan(0));
};

describe('httpGet — повтор на 429 при сборке (LEGACY-411)', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('при сборке ждёт полный Retry-After и повторяет со своим signal', async () => {
    vi.stubEnv('NEXT_PHASE', 'phase-production-build');
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const state = useLimiter('/build-429', ['429', 'ok']);
    vi.useFakeTimers({ shouldAdvanceTime: true });

    const promise = httpGet<{ ok: boolean }>('/build-429');
    await untilRetryIsScheduled(state);

    await vi.advanceTimersByTimeAsync(50_000);
    expect(state.calls).toBe(1);

    await vi.advanceTimersByTimeAsync(11_000);
    await expect(promise).resolves.toEqual({ ok: true });
    expect(state.calls).toBe(2);

    const firstSignal = fetchSpy.mock.calls[0][1]?.signal;
    const retrySignal = fetchSpy.mock.calls[1][1]?.signal;
    expect(firstSignal).toBeUndefined();
    expect(retrySignal).toBeInstanceOf(AbortSignal);
  });

  it('вне сборки не повторяет: 429 сразу уходит ApiError', async () => {
    const state = useLimiter('/runtime-429', ['429', 'ok']);
    vi.useFakeTimers({ shouldAdvanceTime: true });

    let result: unknown;
    void httpGet('/runtime-429').catch((error: unknown) => {
      result = error;
    });

    // Пауза вне сборки видна сразу поставленным таймером, а не таймаутом теста.
    await vi.waitFor(
      () => {
        expect(vi.getTimerCount()).toBe(0);
        expect(result).toBeInstanceOf(ApiError);
      },
      { timeout: 2_000 }
    );
    expect((result as ApiError).statusCode).toBe(429);
    expect(state.calls).toBe(1);
  });

  it('при сборке обычный ответ не ждёт и не повторяется', async () => {
    vi.stubEnv('NEXT_PHASE', 'phase-production-build');
    const state = useLimiter('/build-ok', ['ok']);
    vi.useFakeTimers({ shouldAdvanceTime: true });

    await expect(httpGet<{ ok: boolean }>('/build-ok')).resolves.toEqual({ ok: true });
    expect(state.calls).toBe(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('при сборке повтор идёт с signal вызывающего, если он передан', async () => {
    vi.stubEnv('NEXT_PHASE', 'phase-production-build');
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const state = useLimiter('/build-429-own-signal', ['429', 'ok']);
    const callerSignal = new AbortController().signal;
    vi.useFakeTimers({ shouldAdvanceTime: true });

    const promise = httpGet<{ ok: boolean }>('/build-429-own-signal', { signal: callerSignal });
    await untilRetryIsScheduled(state);
    await vi.advanceTimersByTimeAsync(61_000);

    await expect(promise).resolves.toEqual({ ok: true });
    expect(fetchSpy.mock.calls[1][1]?.signal).toBe(callerSignal);
  });

  it('повторяет только один раз: второй 429 уходит ApiError', async () => {
    vi.stubEnv('NEXT_PHASE', 'phase-production-build');
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const state = useLimiter('/build-429-twice', ['429']);
    vi.useFakeTimers({ shouldAdvanceTime: true });

    const promise = httpGet('/build-429-twice').catch((error: unknown) => error);
    await untilRetryIsScheduled(state);
    await vi.advanceTimersByTimeAsync(61_000);
    const result = await promise;

    expect(result).toBeInstanceOf(ApiError);
    expect((result as ApiError).statusCode).toBe(429);
    expect(state.calls).toBe(2);
  });

  it('повтор несёт next.revalidate, даже если Next удалил его из опций первого вызова', async () => {
    vi.stubEnv('NEXT_PHASE', 'phase-production-build');
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const realFetch = globalThis.fetch;
    const seenNext: unknown[] = [];
    // Так ведёт себя patch-fetch Next при промахе кэша: `delete init.next` у переданного объекта.
    vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
      const withNext = init as (RequestInit & { next?: unknown }) | undefined;
      seenNext.push(withNext?.next);
      if (withNext) delete withNext.next;
      return realFetch(input, init);
    });
    const state = useLimiter('/build-429-next', ['429', 'ok']);
    vi.useFakeTimers({ shouldAdvanceTime: true });

    const promise = httpGet<{ ok: boolean }>('/build-429-next', { next: { revalidate: 300 } });
    await untilRetryIsScheduled(state);
    await vi.advanceTimersByTimeAsync(61_000);

    await expect(promise).resolves.toEqual({ ok: true });
    expect(seenNext).toEqual([{ revalidate: 300 }, { revalidate: 300 }]);
  });

  it('без Retry-After ждёт потолок 65 с, а не повторяет сразу', async () => {
    vi.stubEnv('NEXT_PHASE', 'phase-production-build');
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const state = useLimiter('/build-429-no-header', ['429-no-header', 'ok']);
    vi.useFakeTimers({ shouldAdvanceTime: true });

    const promise = httpGet<{ ok: boolean }>('/build-429-no-header');
    await untilRetryIsScheduled(state);

    await vi.advanceTimersByTimeAsync(55_000);
    expect(state.calls).toBe(1);

    await vi.advanceTimersByTimeAsync(11_000);
    await expect(promise).resolves.toEqual({ ok: true });
    expect(state.calls).toBe(2);
  });
});
