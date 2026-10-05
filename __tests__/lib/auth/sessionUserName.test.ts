// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authOptions } from '@/lib/auth/config';
import type { Account, Session, User } from 'next-auth';
import type { JWT } from 'next-auth/jwt';
import type { Provider } from 'next-auth/providers';

/**
 * `LEGACY-380`: бэкенд отдаёт имя пользователя полем `name`; `displayName` у него нет.
 * Сессия обязана нести `name`, из которого админская шапка берёт подпись.
 */

type JwtCallback = (params: { token: JWT; user?: User; account?: Account | null }) => Promise<JWT>;
type SessionCallback = (params: { session: Session; token: JWT }) => Promise<Session>;

const callbacks = (
  authOptions as unknown as { callbacks: { jwt: JwtCallback; session: SessionCallback } }
).callbacks;

type Authorize = (credentials: Record<string, unknown>, request: Request) => Promise<unknown>;

// Свой `authorize` лежит в `options` (см. `signInErrorCodes.test.ts`): сам провайдер — заглушка.
const credentialsProvider = (authOptions as unknown as { providers: Provider[] }).providers.find(
  (p) => (p as { id?: string }).id === 'credentials'
) as unknown as { options: { authorize: Authorize } };

const backendLogin = {
  user: { id: 'u1', email: 'a@example.com', name: 'Ada Admin', roles: ['admin'] },
  accessToken: 'acc',
  refreshToken: 'ref',
};

describe('session user name (LEGACY-380)', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('puts the backend `name` into the token and the session', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(backendLogin),
      })
    );

    const token = await callbacks.jwt({
      token: {} as JWT,
      user: { id: 'u1' } as unknown as User,
      account: {
        provider: 'google',
        type: 'oidc',
        providerAccountId: 'g',
        id_token: 't',
      } as Account,
    });
    const session = await callbacks.session({ session: { user: {} } as Session, token });

    expect(token.name).toBe('Ada Admin');
    expect(session.user.name).toBe('Ada Admin');
    expect(session.user).not.toHaveProperty('displayName');
  });

  // Основной путь админа — пароль: `authorize` → ветка `credentials` колбэка `jwt`.
  it('carries `name` through the password login', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(backendLogin) })
    );

    const user = (await credentialsProvider.options.authorize(
      { email: 'a@example.com', password: 'secret' },
      new Request('http://localhost/api/auth/callback/credentials')
    )) as User;
    const token = await callbacks.jwt({
      token: {} as JWT,
      user,
      account: { provider: 'credentials', type: 'credentials', providerAccountId: 'u1' } as Account,
    });
    const session = await callbacks.session({ session: { user: {} } as Session, token });

    expect(user.name).toBe('Ada Admin');
    expect(session.user.name).toBe('Ada Admin');
  });

  // Токен, выданный до перехода, несёт имя в `displayName`; обновление токена имя
  // не перечитывает, поэтому сессия обязана прочитать прежнее поле.
  it('reads the name from a token issued before the rename', async () => {
    const legacyToken = {
      id: 'u1',
      email: 'a@example.com',
      displayName: 'Old Name',
    } as unknown as JWT;

    const session = await callbacks.session({
      session: { user: {} } as Session,
      token: legacyToken,
    });

    expect(session.user.name).toBe('Old Name');
  });

  // Старый токен входа через Google несёт и `name` (профиль провайдера из токена Auth.js
  // по умолчанию), и `displayName` (имя с сервера): показывается серверное.
  it('prefers the server name of a legacy token over the provider profile name', async () => {
    const legacyGoogleToken = {
      id: 'u1',
      email: 'a@example.com',
      name: 'Google Profile Name',
      displayName: 'Server Name',
    } as unknown as JWT;

    const session = await callbacks.session({
      session: { user: {} } as Session,
      token: legacyGoogleToken,
    });

    expect(session.user.name).toBe('Server Name');
  });

  // Имя собирается тем же правилом, что в остальной админке (`userDisplayName`):
  // при пустом `name` берутся имя и фамилия.
  it('builds the name from first and last name when `name` is empty', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            ...backendLogin,
            user: { ...backendLogin.user, name: null, firstName: 'Mark', lastName: 'Twain' },
          }),
      })
    );

    const user = (await credentialsProvider.options.authorize(
      { email: 'a@example.com', password: 'secret' },
      new Request('http://localhost/api/auth/callback/credentials')
    )) as User;

    expect(user.name).toBe('Mark Twain');
  });

  // Старый токен, где сервер не знал имени, нёс `displayName: null`; как и до перехода,
  // показывается почта, а не имя профиля провайдера, которое Auth.js кладёт в `name`.
  it('shows the email for a legacy token whose server name was empty', async () => {
    const legacyToken = {
      id: 'u1',
      email: 'a@example.com',
      name: 'Google Profile Name',
      displayName: null,
    } as unknown as JWT;

    const session = await callbacks.session({
      session: { user: {} } as Session,
      token: legacyToken,
    });

    expect(session.user.name).toBe('a@example.com');
  });
});
