import { http, HttpResponse } from 'msw';
import { describe, it, expect, vi } from 'vitest';
import { AUTH_ERROR_DICT_KEY, AuthErrorType, authErrorDictKey } from '@/lib/auth/constants';
import { STATUS_MESSAGES, describeApiFailure, toUserMessage } from '@/lib/errors';
import { httpGet } from '@/lib/http';
import { API_ERROR_TYPE, HTTP_STATUS } from '@/lib/http.constants';
import en from '@/lib/i18n/locales/en.json';
import es from '@/lib/i18n/locales/es.json';
import fr from '@/lib/i18n/locales/fr.json';
import pt from '@/lib/i18n/locales/pt.json';
import ru from '@/lib/i18n/locales/ru.json';
import { ApiError } from '@/types/api';
import { server } from '../msw/server';

// Сессии нет — именно этот путь и ставил литерал «Authentication required».
vi.mock('next-auth/react', () => ({
  getSession: vi.fn(async () => null),
  signOut: vi.fn(async () => undefined),
}));

const dictionaries = { en, es, fr, pt, ru };

const readKey = (dict: unknown, key: string): unknown =>
  key.split('.').reduce<unknown>((value, part) => {
    if (value && typeof value === 'object' && part in (value as Record<string, unknown>)) {
      return (value as Record<string, unknown>)[part];
    }
    return undefined;
  }, dict);

/**
 * 🔴 `LEGACY-053`: внутренние константы играли две роли сразу — код отказа и текст
 * для пользователя. Любое место, отрендерившее `error.message`, показывало русскому
 * читателю английскую фразу из кода фронта, а не из словаря.
 *
 * Сторожа ниже краснеют на возврате именно этого: фраза, собранная транспортом,
 * и сравнение кодов по английскому тексту.
 */
describe('коды отказа отделены от текстов', () => {
  it('страница входа находит текст по коду, а не по английской фразе', () => {
    expect(authErrorDictKey(AuthErrorType.INVALID_CREDENTIALS)).toBe(
      'auth.signin.invalidCredentials'
    );
    expect(authErrorDictKey(AuthErrorType.RATE_LIMIT_EXCEEDED)).toBe('auth.signin.rateLimit');
    expect(authErrorDictKey(AuthErrorType.MISSING_CREDENTIALS)).toBe(
      'auth.signin.missingCredentials'
    );

    // Прежняя английская фраза кодом больше не является и уходит в общий текст.
    expect(authErrorDictKey('Invalid credentials')).toBe('auth.signin.genericError');
    expect(authErrorDictKey(null)).toBe('auth.signin.genericError');
  });

  it('каждый код отказа входа ведёт на живой ключ во всех пяти словарях', () => {
    for (const key of Object.values(AUTH_ERROR_DICT_KEY)) {
      for (const [lang, dict] of Object.entries(dictionaries)) {
        expect(typeof readKey(dict, key), `${lang}: ${key}`).toBe('string');
      }
    }
  });

  it('http-клиент не подставляет своего текста: без message бэкенда берётся карта', async () => {
    server.use(
      http.get('http://localhost:5000/api/no-message', () =>
        HttpResponse.json({ error: 'Forbidden' }, { status: HTTP_STATUS.FORBIDDEN })
      )
    );

    const error = await httpGet('/no-message').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).message).toBe(STATUS_MESSAGES[HTTP_STATUS.FORBIDDEN]);
    // Прежнее умолчание транспорта — «An error occurred» — не должно вернуться.
    expect((error as ApiError).message).not.toBe('An error occurred');
  });

  it('message бэкенда остаётся нетронутым', async () => {
    server.use(
      http.get('http://localhost:5000/api/with-message', () =>
        HttpResponse.json({ message: 'Слаг занят' }, { status: HTTP_STATUS.CONFLICT })
      )
    );

    const error = await httpGet('/with-message').catch((e: unknown) => e);

    expect((error as ApiError).message).toBe('Слаг занят');
    expect(toUserMessage(error)).toBe('Слаг занят');
  });

  it('битое тело описывается кодом разбора, а не статусом', () => {
    expect(describeApiFailure(HTTP_STATUS.OK, API_ERROR_TYPE.PARSE_ERROR)).toBe(
      'The server returned a malformed response'
    );
  });

  it('отсутствие токена даёт код Unauthorized, а не фразу «Authentication required»', async () => {
    // Зовём настоящий `getAccessToken`, а не собираем `ApiError` руками: иначе
    // возврат литерала в `lib/http-client/auth.ts` не покраснил бы ничего.
    const { getAccessToken } = await import('@/lib/http-client/auth');
    const error = await getAccessToken(true).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).error).toBe(API_ERROR_TYPE.UNAUTHORIZED);
    expect((error as ApiError).message).toBe(STATUS_MESSAGES[HTTP_STATUS.UNAUTHORIZED]);
    expect((error as ApiError).message).not.toBe('Authentication required');
  });

  it('ApiError без message получает фразу из карты, а не пустоту', () => {
    const error = new ApiError({
      message: '',
      statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      error: API_ERROR_TYPE.UNKNOWN_ERROR,
    });

    expect(toUserMessage(error)).toBe(STATUS_MESSAGES[HTTP_STATUS.INTERNAL_SERVER_ERROR]);
  });
});
