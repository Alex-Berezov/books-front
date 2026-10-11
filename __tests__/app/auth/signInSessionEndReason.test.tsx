import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import SignInClient from '@/app/[lang]/auth/sign-in/SignInClient';

/**
 * `LEGACY-466`: после принудительного выхода страница входа говорит причину над формой
 * (`?reason=…`); чужое значение параметра ничего не показывает.
 */

const params = { reason: null as string | null };

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => ({ get: (key: string) => (key === 'reason' ? params.reason : null) }),
  useParams: () => ({ lang: 'ru' }),
  usePathname: () => '/ru/auth/sign-in',
}));

vi.mock('next-auth/react', () => ({ signIn: vi.fn() }));

describe('причина выхода на странице входа (LEGACY-466)', () => {
  it('заблокированному — своя фраза над формой', () => {
    params.reason = 'AccountDisabled';
    render(<SignInClient />);
    expect(
      screen.getByText('Эта учётная запись заблокирована. Если это ошибка, напишите в поддержку.')
    ).toBeTruthy();
  });

  it('конец сессии — «сеанс завершён»', () => {
    params.reason = 'SessionEnded';
    render(<SignInClient />);
    expect(screen.getByText('Сеанс завершён. Войдите снова.')).toBeTruthy();
  });

  it('чужое значение — без надписи', () => {
    params.reason = 'toString';
    render(<SignInClient />);
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByText('toString')).toBeNull();
  });
});
