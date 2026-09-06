import { getSession } from 'next-auth/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * LEGACY-267. `getCurrentSession` кэшировал сессию по истинности `cachedSession`:
 * отрицательный ответ (аноним, `null`) не кэшировался никогда, поэтому каждый
 * вызов `getOptionalAccessToken` в читалке уходил в `getSession()` заново —
 * лишний поход к `/api/auth/session` перед каждой книгой. Флаг `sessionKnown`
 * отличает «не спрашивали» от «спросили, сессии нет».
 *
 * Модуль `@/lib/http-client/auth` держит состояние кэша на уровне модуля, а не
 * компонента, поэтому каждый тест импортирует его заново после `vi.resetModules()`
 * — иначе состояние одного теста било бы по следующему.
 */

vi.mock('next-auth/react', () => ({
  getSession: vi.fn(async () => null),
  signOut: vi.fn(),
}));

const getSessionMock = vi.mocked(getSession);

describe('getCurrentSession — кэш отрицательного ответа', () => {
  beforeEach(() => {
    vi.resetModules();
    getSessionMock.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('setSession(null) кэшируется: подряд идущие вызовы не ходят в сеть', async () => {
    const { getOptionalAccessToken, setSession } = await import('@/lib/http-client/auth');
    setSession(null);

    await getOptionalAccessToken();
    await getOptionalAccessToken();

    expect(getSessionMock).not.toHaveBeenCalled();
  });

  it('без предварительного setSession первый вызов идёт в сеть, второй — из кэша', async () => {
    const { getCurrentSession } = await import('@/lib/http-client/auth');

    await getCurrentSession();
    await getCurrentSession();

    expect(getSessionMock).toHaveBeenCalledTimes(1);
  });
});
