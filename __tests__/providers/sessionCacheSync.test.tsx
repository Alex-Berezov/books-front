import type { ReactNode } from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setSession } from '@/lib/http-client/auth';
import { AppProviders } from '@/providers/AppProviders';

/**
 * LEGACY-267. Кэш сессии в http-клиенте помнит и отрицательный ответ («сессии
 * нет») — минуту. Значит он обязан следовать за настоящей сессией, а не ставиться
 * один раз при монтировании.
 *
 * 🔴 Цена ошибки не в лишнем запросе, а в обратную сторону. Вход по паролю идёт
 * без перезагрузки страницы (`signIn(..., { redirect: false })` + `router.push`),
 * а `session` пропом в провайдеры не приходит вовсе. Отметка, поставленная на
 * монтировании, держала бы «сессии нет» ещё минуту после успешного входа:
 * `getAccessToken` бросал бы 401 не дойдя до сети, а слияние локального прогресса,
 * которое запускается ровно в этот момент, пропустило бы все книги разом и за
 * визит больше не повторилось.
 */

const sessionState: { data: unknown; status: string } = { data: null, status: 'unauthenticated' };

vi.mock('next/navigation', () => ({
  useParams: () => ({ lang: 'en' }),
}));

vi.mock('next-auth/react', () => ({
  SessionProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  useSession: () => sessionState,
  getSession: vi.fn(async () => null),
  signOut: vi.fn(async () => undefined),
}));

vi.mock('@/lib/http-client/auth', () => ({
  setSession: vi.fn(),
}));

const setSessionMock = vi.mocked(setSession);

describe('AppProviders держит кэш сессии равным настоящей сессии', () => {
  beforeEach(() => {
    setSessionMock.mockClear();
  });

  it('анониму кладёт в кэш именно null, а не «не знаем»', () => {
    sessionState.data = null;
    sessionState.status = 'unauthenticated';

    render(
      <AppProviders>
        <span>дети</span>
      </AppProviders>
    );

    expect(setSessionMock).toHaveBeenCalledWith(null);
  });

  it('пока сессия грузится, в кэш не кладётся ничего', () => {
    sessionState.data = null;
    sessionState.status = 'loading';

    render(
      <AppProviders>
        <span>дети</span>
      </AppProviders>
    );

    expect(setSessionMock).not.toHaveBeenCalled();
  });

  it('появившаяся сессия доезжает до кэша — вход без перезагрузки страницы', () => {
    sessionState.data = { accessToken: 'token-1', user: { id: 'user-1' } };
    sessionState.status = 'authenticated';

    render(
      <AppProviders>
        <span>дети</span>
      </AppProviders>
    );

    expect(setSessionMock).toHaveBeenCalledWith(sessionState.data);
  });
});
