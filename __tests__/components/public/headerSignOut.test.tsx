import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Header } from '@/components/public/layout/Header';

const { signOutWithRevokeMock } = vi.hoisted(() => ({ signOutWithRevokeMock: vi.fn() }));

vi.mock('@/lib/auth/sign-out', () => ({ signOutWithRevoke: signOutWithRevokeMock }));

const liveSession = { user: { id: 'u1', email: 'reader@example.com', roles: ['user'] } };
const sessionState: { data: { user: object; error?: string } } = { data: liveSession };

vi.mock('next-auth/react', () => ({
  useSession: () => ({ data: sessionState.data, status: 'authenticated' }),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/en',
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: () => ({ data: undefined, isLoading: false }),
}));

vi.mock('@/components/LanguageSwitcher', () => ({ LanguageSwitcher: () => null }));

/**
 * `LEGACY-451`, `T122`: выход в шапке сайта идёт через общий выход с отзывом сессий
 * (`lib/auth/sign-out.ts`), а не через голый `signOut` — порядок держит одна функция.
 */
describe('выход в шапке сайта (LEGACY-451)', () => {
  beforeEach(() => {
    sessionState.data = liveSession;
    signOutWithRevokeMock.mockReset().mockResolvedValue(undefined);
  });

  it('выход — через общий выход с отзывом сессий, на главную своего языка', () => {
    render(<Header />);
    fireEvent.click(screen.getByRole('button', { name: 'User menu' }));
    fireEvent.click(screen.getByRole('button', { name: 'Sign Out' }));

    expect(signOutWithRevokeMock).toHaveBeenCalledTimes(1);
    expect(signOutWithRevokeMock).toHaveBeenCalledWith('/en');
  });
});

/** `LEGACY-466`: мёртвая сессия в шапке «вошёл» не показывает, пока выход ещё в пути. */
describe('шапка и мёртвая сессия (LEGACY-466)', () => {
  it('сессия с SessionEnded — меню пользователя нет', () => {
    sessionState.data = { user: { id: 'u1', roles: ['user'] }, error: 'SessionEnded' };
    render(<Header />);
    expect(screen.queryByRole('button', { name: 'User menu' })).toBeNull();
  });

  it('временный отказ refresh — меню на месте', () => {
    sessionState.data = { user: { id: 'u1', roles: ['user'] }, error: 'RefreshAccessTokenError' };
    render(<Header />);
    expect(screen.getByRole('button', { name: 'User menu' })).toBeTruthy();
  });
});
