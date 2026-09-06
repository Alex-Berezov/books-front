// @vitest-environment node
import { CredentialsSignin } from '@auth/core/errors';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { authOptions } from '@/lib/auth/config';
import { AUTH_ERROR_DICT_KEY, AuthErrorType, authErrorDictKey } from '@/lib/auth/constants';
import type { Provider } from 'next-auth/providers';

type Authorize = (
  credentials: Record<string, unknown>,
  request: Request
) => Promise<unknown> | unknown;

/**
 * ⚠️ Собственный `authorize` лежит в `options`, а не на самом провайдере:
 * `Credentials()` из `@auth/core` возвращает заготовку с `authorize: () => null`
 * и кладёт переданную конфигурацию в поле `options`. Позвать провайдер напрямую —
 * значит проверить заглушку библиотеки и получить зелёный тест ни на чём.
 */
const credentialsProvider = (authOptions as unknown as { providers: Provider[] }).providers.find(
  (p) => (p as { id?: string }).id === 'credentials'
) as unknown as { options: { authorize: Authorize } };

const request = new Request('http://localhost/api/auth/callback/credentials');

const authorizeError = async (credentials: Record<string, unknown>): Promise<unknown> => {
  try {
    await credentialsProvider.options.authorize(credentials, request);
  } catch (e) {
    return e;
  }
  return null;
};

/**
 * 🔴 Код отказа доезжает до страницы входа **только** от наследника
 * `CredentialsSignin`: обычный `Error` `@auth/core` заворачивает в
 * `CallbackRouteError`, тот не входит в белый список клиентски безопасных типов,
 * и наружу уходит `error=Configuration` — то есть причина теряется, а посетитель
 * на 429 и на неверном пароле видит один и тот же общий текст (`LEGACY-053`).
 *
 * Сторож краснеет ровно на этом возврате: `throw new Error(AuthErrorType.X)`
 * вместо `SignInCodeError` перестаёт быть `CredentialsSignin` и теряет `code`.
 */
describe('коды отказа входа переживают дорогу до клиента', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('пустые поля дают CredentialsSignin с кодом, а не голый Error', async () => {
    const error = await authorizeError({ email: '', password: '' });

    expect(error).toBeInstanceOf(CredentialsSignin);
    expect((error as CredentialsSignin).code).toBe(AuthErrorType.MISSING_CREDENTIALS);
  });

  it('рейт-лимит бэкенда отличим от неверного пароля', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{}', { status: 429 }))
    );
    const rateLimited = await authorizeError({ email: 'a@b.c', password: 'secret' });

    expect(rateLimited).toBeInstanceOf(CredentialsSignin);
    expect((rateLimited as CredentialsSignin).code).toBe(AuthErrorType.RATE_LIMIT_EXCEEDED);

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{}', { status: 401 }))
    );
    const invalid = await authorizeError({ email: 'a@b.c', password: 'secret' });

    expect((invalid as CredentialsSignin).code).toBe(AuthErrorType.INVALID_CREDENTIALS);
  });

  it('любой другой отказ бэкенда несёт свой код, а не английскую фразу', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{}', { status: 503 }))
    );
    const error = await authorizeError({ email: 'a@b.c', password: 'secret' });

    expect((error as CredentialsSignin).code).toBe(AuthErrorType.AUTHENTICATION_FAILED);
    expect((error as Error).message).not.toMatch(/Authentication failed/);
  });

  it('каждый брошенный код имеет ключ словаря, а чужое значение сводится к общему', () => {
    for (const code of Object.values(AuthErrorType)) {
      expect(AUTH_ERROR_DICT_KEY[code]).toBeTypeOf('string');
    }

    // Значение приходит из адресной строки: ключ прототипа не должен пролезать.
    expect(authErrorDictKey('toString')).toBe('auth.signin.genericError');
    expect(authErrorDictKey('constructor')).toBe('auth.signin.genericError');
    expect(authErrorDictKey(undefined)).toBe('auth.signin.genericError');
  });
});
