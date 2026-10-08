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
 * 🔴 `LEGACY-442`: формы входа и регистрации ушли с `Form` antd на свою разметку.
 * Правила полей теперь живут в коде страниц, а не в `rules` antd, и их легко
 * потерять молча: форма продолжит отправляться, а сервер — отбивать запрос.
 *
 * Тексты берутся из настоящего словаря `en`: сторож заодно ловит ключ,
 * которого в словаре нет (тогда на экране сырой ключ, а не фраза).
 */

const typeInto = (input: HTMLElement, value: string) => {
  fireEvent.change(input, { target: { value } });
};

describe('форма входа: правила полей', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const emailInput = () => screen.getByLabelText('Email', { selector: 'input' });
  const passwordInput = () => screen.getByLabelText('Password', { selector: 'input' });
  const submit = () => fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));

  it('пустая отправка показывает обе ошибки и не зовёт signIn', async () => {
    render(<SignInClient />);
    submit();

    expect(await screen.findByText('Please enter your email')).toBeInTheDocument();
    expect(screen.getByText('Please enter your password')).toBeInTheDocument();
    expect(signIn).not.toHaveBeenCalled();

    // Ошибка связана с полем, как было у `Form.Item` antd.
    expect(emailInput()).toHaveAttribute('aria-invalid', 'true');
    expect(emailInput()).toHaveAttribute('aria-describedby', 'sign-in_email_help');
    expect(document.getElementById('sign-in_email_help')).toHaveTextContent(
      'Please enter your email'
    );
  });

  it('неверный адрес отбивается до запроса', async () => {
    render(<SignInClient />);
    typeInto(emailInput(), 'not-an-email');
    typeInto(passwordInput(), 'password123');
    submit();

    expect(await screen.findByText('Please enter a valid email')).toBeInTheDocument();
    expect(signIn).not.toHaveBeenCalled();
  });

  it('ошибка появляется на вводе и уходит, когда поле исправлено', async () => {
    render(<SignInClient />);
    typeInto(emailInput(), 'bad');
    expect(await screen.findByText('Please enter a valid email')).toBeInTheDocument();

    typeInto(emailInput(), 'reader@example.com');
    await waitFor(() => {
      expect(screen.queryByText('Please enter a valid email')).toBeNull();
    });
    expect(emailInput()).toHaveAttribute('aria-invalid', 'false');
  });

  it('верные поля уходят в signIn', async () => {
    vi.mocked(signIn).mockResolvedValue(undefined as never);
    render(<SignInClient />);
    typeInto(emailInput(), 'reader@example.com');
    typeInto(passwordInput(), 'secret');
    submit();

    await waitFor(() => {
      expect(signIn).toHaveBeenCalledWith('credentials', {
        redirect: false,
        email: 'reader@example.com',
        password: 'secret',
        callbackUrl: '/en',
      });
    });
  });

  it('кнопка показа пароля переключает видимость и подпись', () => {
    render(<SignInClient />);
    expect(passwordInput()).toHaveAttribute('type', 'password');

    fireEvent.click(screen.getByRole('button', { name: 'Show password' }));
    expect(passwordInput()).toHaveAttribute('type', 'text');

    fireEvent.click(screen.getByRole('button', { name: 'Hide password' }));
    expect(passwordInput()).toHaveAttribute('type', 'password');
  });
});

describe('форма регистрации: правила полей', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const emailInput = () => screen.getByLabelText('Email', { selector: 'input' });
  const passwordInput = () => screen.getByLabelText('Password', { selector: 'input' });
  const confirmInput = () => screen.getByLabelText('Confirm Password', { selector: 'input' });
  const submit = () => fireEvent.click(screen.getByRole('button', { name: 'Create Account' }));

  it('пустая отправка показывает три ошибки и не зовёт бэкенд', async () => {
    render(<RegisterClient />);
    submit();

    expect(await screen.findByText('Please enter your email')).toBeInTheDocument();
    expect(screen.getByText('Please enter your password')).toBeInTheDocument();
    expect(screen.getByText('Please confirm your password')).toBeInTheDocument();
    expect(httpPost).not.toHaveBeenCalled();
  });

  it('неверный адрес отбивается до запроса', async () => {
    render(<RegisterClient />);
    typeInto(emailInput(), 'reader@');
    typeInto(passwordInput(), 'secret123');
    typeInto(confirmInput(), 'secret123');
    submit();

    expect(await screen.findByText('Please enter a valid email')).toBeInTheDocument();
    expect(httpPost).not.toHaveBeenCalled();
  });

  it('пароль короче восьми знаков отбивается до запроса', async () => {
    render(<RegisterClient />);
    typeInto(emailInput(), 'reader@example.com');
    typeInto(passwordInput(), 'secret1');
    typeInto(confirmInput(), 'secret1');
    submit();

    expect(await screen.findByText('Password must be at least 8 characters')).toBeInTheDocument();
    expect(httpPost).not.toHaveBeenCalled();
  });

  it('несовпадение паролей отбивается до запроса', async () => {
    render(<RegisterClient />);
    typeInto(emailInput(), 'reader@example.com');
    typeInto(passwordInput(), 'secret123');
    typeInto(confirmInput(), 'secret124');
    submit();

    expect(await screen.findByText('Passwords do not match')).toBeInTheDocument();
    expect(httpPost).not.toHaveBeenCalled();
  });

  it('смена пароля перепроверяет уже введённое подтверждение', async () => {
    render(<RegisterClient />);
    typeInto(passwordInput(), 'secret123');
    typeInto(confirmInput(), 'secret123');
    expect(screen.queryByText('Passwords do not match')).toBeNull();

    typeInto(passwordInput(), 'secret1234');
    expect(await screen.findByText('Passwords do not match')).toBeInTheDocument();

    typeInto(passwordInput(), 'secret123');
    await waitFor(() => {
      expect(screen.queryByText('Passwords do not match')).toBeNull();
    });
  });

  it('верные поля уходят на бэкенд без подтверждения пароля', async () => {
    vi.mocked(httpPost).mockResolvedValue({} as never);
    render(<RegisterClient />);
    typeInto(emailInput(), 'reader@example.com');
    typeInto(passwordInput(), 'secret123');
    typeInto(confirmInput(), 'secret123');
    submit();

    await waitFor(() => {
      expect(httpPost).toHaveBeenCalledWith('/auth/register', {
        email: 'reader@example.com',
        password: 'secret123',
      });
    });
  });
});
