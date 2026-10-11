import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthErrorType } from '@/lib/auth/constants';
import { endDeadSession, isAuthPagePath } from '@/lib/auth/session-end';
import { clearLoggedInMarker } from '@/lib/auth/sessionMarker';
import { toast } from '@/lib/utils/toast';

/**
 * `LEGACY-466`, решение арбитра 11.10.2026: мёртвая сессия снимается тихо; из админки — на вход
 * своего языка с причиной и адресом возврата, на сайте страница остаётся и показывает тост.
 */

const { signOutMock } = vi.hoisted(() => ({ signOutMock: vi.fn() }));

vi.mock('next-auth/react', () => ({ signOut: signOutMock }));
vi.mock('@/lib/auth/sessionMarker', () => ({ clearLoggedInMarker: vi.fn() }));
vi.mock('@/lib/utils/toast', () => ({ toast: { info: vi.fn() } }));

const at = (pathname: string, search = '') => ({ pathname, search, assign: vi.fn() });

describe('тихий выход из мёртвой сессии (LEGACY-466)', () => {
  beforeEach(() => {
    signOutMock.mockReset().mockResolvedValue(undefined);
    vi.mocked(toast.info).mockClear();
    vi.mocked(clearLoggedInMarker).mockClear();
  });

  it('админка: выход без перехода, затем вход своего языка с причиной и адресом возврата', async () => {
    const location = at('/admin/ru/books', '?page=2');

    await endDeadSession(AuthErrorType.ACCOUNT_DISABLED, location);

    expect(clearLoggedInMarker).toHaveBeenCalledTimes(1);
    expect(signOutMock).toHaveBeenCalledWith({ redirect: false });
    // Отметка снимается после выхода: отказ выхода не должен оставить куку без отметки.
    expect(signOutMock.mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(clearLoggedInMarker).mock.invocationCallOrder[0]
    );
    expect(location.assign).toHaveBeenCalledTimes(1);
    const target = new URL(location.assign.mock.calls[0][0] as string, 'https://x');
    expect(target.pathname).toBe('/ru/auth/sign-in');
    expect(target.searchParams.get('reason')).toBe('AccountDisabled');
    expect(target.searchParams.get('callbackUrl')).toBe('/admin/ru/books?page=2');
    expect(toast.info).not.toHaveBeenCalled();
  });

  it('читалка: страница остаётся, один тост с фразой причины на языке страницы', async () => {
    const location = at('/ru/book/hamlet/read');

    await endDeadSession(AuthErrorType.SESSION_ENDED, location);

    expect(signOutMock).toHaveBeenCalledWith({ redirect: false });
    expect(location.assign).not.toHaveBeenCalled();
    expect(toast.info).toHaveBeenCalledTimes(1);
    expect(toast.info).toHaveBeenCalledWith('Сеанс завершён. Войдите снова.');
  });

  it('страница входа с причиной в адресе тост не дублирует', async () => {
    const location = at('/en/auth/sign-in', '?reason=AccountDisabled&callbackUrl=%2Fadmin%2Fen');

    await endDeadSession(AuthErrorType.ACCOUNT_DISABLED, location);

    expect(signOutMock).toHaveBeenCalledWith({ redirect: false });
    expect(location.assign).not.toHaveBeenCalled();
    expect(toast.info).not.toHaveBeenCalled();
  });

  it('отказ выхода пробрасывается: защёлка в провайдере должна его видеть', async () => {
    signOutMock.mockRejectedValueOnce(new Error('network'));

    await expect(endDeadSession(AuthErrorType.SESSION_ENDED, at('/en'))).rejects.toThrow('network');
    expect(toast.info).not.toHaveBeenCalled();
    expect(clearLoggedInMarker).not.toHaveBeenCalled();
  });

  it('корень админки без языка — тоже переход на вход', async () => {
    const location = at('/admin');
    await endDeadSession(AuthErrorType.SESSION_ENDED, location);
    expect(location.assign).toHaveBeenCalledTimes(1);
    expect(toast.info).not.toHaveBeenCalled();
  });

  it('страница входа узнаётся по сегменту, а не по слову в слаге', () => {
    expect(isAuthPagePath('/en/auth/sign-in')).toBe(true);
    expect(isAuthPagePath('/ru/auth')).toBe(true);
    expect(isAuthPagePath('/en/book/auth')).toBe(false);
    expect(isAuthPagePath('/en/authors')).toBe(false);
  });
});
