import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import RegisterClient from '@/app/[lang]/auth/register/RegisterClient';
import { httpPost } from '@/lib/http';
import { ApiError } from '@/types/api';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useParams: () => ({ lang: 'ru' }),
  usePathname: () => '/ru/auth/register',
}));

vi.mock('next-auth/react', () => ({
  signIn: vi.fn(),
}));

vi.mock('@/lib/http', () => ({
  httpPost: vi.fn(),
}));

vi.mock('@/lib/i18n/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) =>
      ({
        'auth.register.title': 'Создать аккаунт',
        'auth.register.emailLabel': 'Электронная почта',
        'auth.register.passwordLabel': 'Пароль',
        'auth.register.confirmLabel': 'Подтвердите пароль',
        'auth.register.submitBtn': 'Создать аккаунт',
        'auth.register.genericError': 'Не удалось создать аккаунт',
        'auth.register.emailTaken': 'Эта почта уже зарегистрирована',
        'auth.register.rateLimit': 'Слишком много запросов. Попробуйте позже.',
        'auth.register.checkFields': 'Проверьте адрес и пароль и попробуйте снова',
      })[key] || key,
    lang: 'ru',
  }),
}));

const submit = async () => {
  fireEvent.change(screen.getByLabelText(/Электронная почта/i), {
    target: { value: 'taken@example.com' },
  });
  const passwords = screen.getAllByLabelText(/Пароль|Подтвердите пароль/i);
  for (const field of passwords) {
    fireEvent.change(field, { target: { value: 'secret123' } });
  }
  fireEvent.click(screen.getByRole('button', { name: 'Создать аккаунт' }));
};

/**
 * 🔴 `LEGACY-053`: страница печатала посетителю `err.message`. После перевода
 * транспорта на коды это стало английской фразой из `STATUS_MESSAGES` — то есть
 * ровно тем, ради чего запись и заведена.
 *
 * Сторож краснеет на возврате `setError(err.message)`: занятая почта обязана
 * называться своим текстом словаря, а неизвестный отказ — общим.
 */
describe('текст отказа регистрации', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('занятая почта показывается своим текстом, а не сообщением сервера', async () => {
    vi.mocked(httpPost).mockRejectedValue(
      new ApiError({
        message: 'This resource already exists or conflicts with existing data',
        statusCode: 409,
        error: 'Conflict',
      })
    );

    render(<RegisterClient />);
    await submit();

    await waitFor(() => {
      expect(screen.getByText('Эта почта уже зарегистрирована')).toBeInTheDocument();
    });
    expect(
      screen.queryByText('This resource already exists or conflicts with existing data')
    ).toBeNull();
  });

  it('валидационный отказ называет, что проверить, а не «не удалось»', async () => {
    // 🔴 Правила длины у сторон расходились: форма пропускала пароль в шесть знаков,
    // бэкенд требует восьми. Схлопнутый в общий текст 400 не оставлял посетителю
    // ни одной подсказки — он жал кнопку с теми же данными.
    vi.mocked(httpPost).mockRejectedValue(
      new ApiError({
        message: 'password must be longer than or equal to 8 characters',
        statusCode: 400,
      })
    );

    render(<RegisterClient />);
    await submit();

    await waitFor(() => {
      expect(screen.getByText('Проверьте адрес и пароль и попробуйте снова')).toBeInTheDocument();
    });
    expect(screen.queryByText('password must be longer than or equal to 8 characters')).toBeNull();
  });

  it('неизвестный отказ сводится к общему тексту словаря', async () => {
    vi.mocked(httpPost).mockRejectedValue(new ApiError({ message: 'Teapot', statusCode: 418 }));

    render(<RegisterClient />);
    await submit();

    await waitFor(() => {
      expect(screen.getByText('Не удалось создать аккаунт')).toBeInTheDocument();
    });
    expect(screen.queryByText('Teapot')).toBeNull();
  });
});
