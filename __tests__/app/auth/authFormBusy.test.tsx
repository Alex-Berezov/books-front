import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { signIn } from 'next-auth/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import RegisterClient from '@/app/[lang]/auth/register/RegisterClient';
import SignInClient from '@/app/[lang]/auth/sign-in/SignInClient';
import { httpPost } from '@/lib/http';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => ({ get: () => null }),
  useParams: () => ({ lang: 'en' }),
  usePathname: () => '/en/auth',
}));

vi.mock('next-auth/react', () => ({
  signIn: vi.fn(),
}));

vi.mock('@/lib/http', () => ({
  httpPost: vi.fn(),
}));

/**
 * 🔴 `LEGACY-442`: пока запрос входа или регистрации в пути, повторная отправка
 * формы не уходит вторым запросом. Кнопка в загрузке глотает только свой клик;
 * отправку формы мимо кнопки (Enter в поле, `requestSubmit`) гасит `useAuthForm`
 * по `busy` — её здесь и проверяем событием `submit` на самой форме.
 */

const typeInto = (input: HTMLElement, value: string) => {
  fireEvent.change(input, { target: { value } });
};

/** Запрос, который не завершится, пока тест его не отпустит. */
const pending = () => {
  let release: (value: unknown) => void = () => undefined;
  const promise = new Promise((resolve) => {
    release = resolve;
  });
  return { promise, release };
};

const getForm = (id: string): HTMLFormElement => {
  const form = document.getElementById(id);
  if (!(form instanceof HTMLFormElement)) throw new Error(`form #${id} not found`);
  return form;
};

describe('повторная отправка во время запроса', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('вход: второй submit, пока signIn в пути, не зовёт signIn снова', async () => {
    const request = pending();
    vi.mocked(signIn).mockReturnValue(request.promise as never);
    render(<SignInClient />);
    typeInto(screen.getByLabelText('Email', { selector: 'input' }), 'reader@example.com');
    typeInto(screen.getByLabelText('Password', { selector: 'input' }), 'secret');

    fireEvent.submit(getForm('sign-in'));
    await waitFor(() => expect(signIn).toHaveBeenCalledTimes(1));

    fireEvent.submit(getForm('sign-in'));
    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));
    expect(signIn).toHaveBeenCalledTimes(1);

    request.release({ ok: false, error: 'CredentialsSignin', code: undefined });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Sign In' })).not.toHaveAttribute('aria-busy');
    });

    // Запрос завершился — отправка снова работает.
    fireEvent.submit(getForm('sign-in'));
    await waitFor(() => expect(signIn).toHaveBeenCalledTimes(2));
  });

  it('регистрация: второй submit, пока httpPost в пути, не зовёт бэкенд снова', async () => {
    const request = pending();
    vi.mocked(httpPost).mockReturnValue(request.promise as never);
    render(<RegisterClient />);
    typeInto(screen.getByLabelText('Email', { selector: 'input' }), 'reader@example.com');
    typeInto(screen.getByLabelText('Password', { selector: 'input' }), 'secret123');
    typeInto(screen.getByLabelText('Confirm Password', { selector: 'input' }), 'secret123');

    fireEvent.submit(getForm('register'));
    await waitFor(() => expect(httpPost).toHaveBeenCalledTimes(1));

    fireEvent.submit(getForm('register'));
    fireEvent.click(screen.getByRole('button', { name: 'Create Account' }));
    expect(httpPost).toHaveBeenCalledTimes(1);

    request.release({});
    expect(await screen.findByText('Account Created!')).toBeInTheDocument();
    expect(httpPost).toHaveBeenCalledTimes(1);
  });
});
