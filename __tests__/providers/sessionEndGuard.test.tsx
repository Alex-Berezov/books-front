import { StrictMode, type ReactNode } from 'react';
import { QueryClient } from '@tanstack/react-query';
import { render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { endDeadSession } from '@/lib/auth/session-end';
import { AppProviders } from '@/providers/AppProviders';

/**
 * `LEGACY-466`. Окончательный отказ сессии (`session.error`) снимает её сам, а не на первом 401
 * личной ручки; временный отказ — нет. Как именно выходить — `lib/auth/session-end.ts`.
 */

const sessionState: { data: unknown; status: string } = { data: null, status: 'unauthenticated' };

const nav = { pathname: '/ru/book/hamlet/read' };

vi.mock('next/navigation', () => ({
  useParams: () => ({ lang: 'ru' }),
  usePathname: () => nav.pathname,
}));
vi.mock('next-auth/react', () => ({
  SessionProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  useSession: () => sessionState,
}));
vi.mock('@/lib/http-client/auth', () => ({ setSession: vi.fn() }));
vi.mock('@/lib/auth/session-end', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/auth/session-end')>()),
  endDeadSession: vi.fn(),
}));

const endDeadSessionMock = vi.mocked(endDeadSession);

const tree = () => (
  <AppProviders>
    <span>дети</span>
  </AppProviders>
);

const withError = (error?: string) => {
  sessionState.data = { user: { id: 'u1' }, error };
  sessionState.status = 'authenticated';
};

describe('выход по окончательному отказу сессии (LEGACY-466)', () => {
  beforeEach(() => {
    endDeadSessionMock.mockReset().mockResolvedValue(undefined);
    nav.pathname = '/ru/book/hamlet/read';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each(['SessionEnded', 'AccountDisabled', 'InvalidCredentials', 'AuthenticationFailed'])(
    '%s — выход с этой причиной',
    (error) => {
      withError(error);
      render(tree());
      expect(endDeadSessionMock).toHaveBeenCalledTimes(1);
      expect(endDeadSessionMock).toHaveBeenCalledWith(error);
    }
  );

  it.each([undefined, 'RefreshAccessTokenError'])('ошибка %s — не выход', (error) => {
    withError(error);
    render(tree());
    expect(endDeadSessionMock).not.toHaveBeenCalled();
  });

  it('перерисовка и StrictMode выход не повторяют', () => {
    withError('SessionEnded');
    const { rerender } = render(<StrictMode>{tree()}</StrictMode>);
    sessionState.data = { user: { id: 'u1' }, error: 'SessionEnded' };
    rerender(<StrictMode>{tree()}</StrictMode>);
    expect(endDeadSessionMock).toHaveBeenCalledTimes(1);
  });

  it('отказ выхода снимает защёлку: следующий опрос сессии пробует снова', async () => {
    endDeadSessionMock.mockRejectedValueOnce(new Error('network'));
    withError('SessionEnded');
    const { rerender } = render(tree());
    await waitFor(() => expect(endDeadSessionMock).toHaveBeenCalledTimes(1));
    await Promise.resolve();

    sessionState.data = { user: { id: 'u1' }, error: 'SessionEnded' };
    rerender(tree());

    await waitFor(() => expect(endDeadSessionMock).toHaveBeenCalledTimes(2));
  });

  it('вошёл снова в той же вкладке — следующая смерть сессии снова замечена', async () => {
    withError('SessionEnded');
    const { rerender } = render(tree());
    await waitFor(() => expect(endDeadSessionMock).toHaveBeenCalledTimes(1));

    withError(undefined);
    rerender(tree());
    withError('AccountDisabled');
    rerender(tree());

    await waitFor(() => expect(endDeadSessionMock).toHaveBeenCalledTimes(2));
    expect(endDeadSessionMock).toHaveBeenLastCalledWith('AccountDisabled');
  });

  it('после выхода кэш запросов чистится: личные данные не достаются следующему', async () => {
    const clear = vi.spyOn(QueryClient.prototype, 'clear');
    withError('SessionEnded');
    render(tree());
    await waitFor(() => expect(clear).toHaveBeenCalledTimes(1));
  });

  it('на странице входа выход не запускается: он стёр бы новую сессию', () => {
    nav.pathname = '/ru/auth/sign-in';
    withError('SessionEnded');
    render(tree());
    expect(endDeadSessionMock).not.toHaveBeenCalled();
  });

  it('ушёл со страницы входа клиентской ссылкой — выход запускается сразу, без опроса', async () => {
    nav.pathname = '/ru/auth/sign-in';
    withError('SessionEnded');
    const { rerender } = render(tree());
    expect(endDeadSessionMock).not.toHaveBeenCalled();

    nav.pathname = '/ru';
    rerender(tree());

    await waitFor(() => expect(endDeadSessionMock).toHaveBeenCalledTimes(1));
  });
});
