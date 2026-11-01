import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import RegisterClient from '@/app/[lang]/auth/register/RegisterClient';
import SignInClient from '@/app/[lang]/auth/sign-in/SignInClient';

/**
 * LEGACY-485: до гидрации у формы нет обработчика React, и нативная отправка без `method`
 * уходит GET-запросом - email и пароль оказываются в адресе (история, логи, Referer).
 * С `method="post"` нативная отправка несёт их телом.
 */
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useParams: () => ({ lang: 'en' }),
  usePathname: () => '/en/auth/sign-in',
  useSearchParams: () => ({ get: () => null }),
}));

vi.mock('next-auth/react', () => ({ signIn: vi.fn() }));

describe('метод формы до гидрации', () => {
  it('вход отправляется POST', () => {
    const { container } = render(<SignInClient />);
    const form = container.querySelector('form#sign-in');
    expect(form).toHaveAttribute('method', 'post');
    expect(form).not.toHaveAttribute('action');
  });

  it('регистрация отправляется POST', () => {
    const { container } = render(<RegisterClient />);
    const form = container.querySelector('form#register');
    expect(form).toHaveAttribute('method', 'post');
    expect(form).not.toHaveAttribute('action');
  });
});
