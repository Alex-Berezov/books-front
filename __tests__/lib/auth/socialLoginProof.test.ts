import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authOptions } from '@/lib/auth/config';
import { AuthErrorType } from '@/lib/auth/constants';
import type { Account, User } from 'next-auth';
import type { JWT } from 'next-auth/jwt';

/**
 * Control landings for step 2 of tasks/auth-social/CR.md.
 *
 * The frontend used to name the account it wanted a session for — it POSTed
 * `{ email }` and the backend obliged. What has to hold now is narrower and
 * stricter: the request carries the provider's own proof and nothing the client
 * could have made up.
 */

type JwtCallback = (params: { token: JWT; user?: User; account?: Account | null }) => Promise<JWT>;

const jwtCallback = (authOptions as unknown as { callbacks: { jwt: JwtCallback } }).callbacks.jwt;

const user = { id: 'u1', email: 'signed-in@example.com', name: 'Someone' } as unknown as User;

function googleAccount(overrides: Partial<Account> = {}): Account {
  return {
    provider: 'google',
    type: 'oidc',
    providerAccountId: 'g-1',
    id_token: 'the-google-id-token',
    ...overrides,
  } as Account;
}

function mockBackend(): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: () =>
      Promise.resolve({
        user: { id: 'u1', email: 'verified@example.com', roles: ['user'] },
        accessToken: 'acc',
        refreshToken: 'ref',
      }),
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function sentBody(fetchMock: ReturnType<typeof vi.fn>): Record<string, unknown> {
  const init = fetchMock.mock.calls[0][1] as { body: string };
  return JSON.parse(init.body) as Record<string, unknown>;
}

describe('social login proof (CR auth-social, step 2)', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('sends the provider id_token', async () => {
    const fetchMock = mockBackend();

    await jwtCallback({ token: {} as JWT, user, account: googleAccount() });

    expect(sentBody(fetchMock)).toEqual({
      provider: 'google',
      token: 'the-google-id-token',
    });
  });

  // The landing that matters: an e-mail in the body is what made the account
  // claimable in the first place. It must be gone, not merely ignored.
  it('sends no e-mail, name or avatar — nothing the client could invent', async () => {
    const fetchMock = mockBackend();

    await jwtCallback({ token: {} as JWT, user, account: googleAccount() });

    const body = sentBody(fetchMock);
    expect(body).not.toHaveProperty('email');
    expect(body).not.toHaveProperty('name');
    expect(body).not.toHaveProperty('avatarUrl');
  });

  // Falling back to the e-mail when a provider stops returning an id_token
  // would silently reopen the hole for that provider.
  it('refuses to sign in when the provider returned no id_token', async () => {
    const fetchMock = mockBackend();

    const result = await jwtCallback({
      token: {} as JWT,
      user,
      account: googleAccount({ id_token: undefined }),
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.error).toBe(AuthErrorType.INVALID_CREDENTIALS);
    expect(result.accessToken).toBeUndefined();
  });

  it('takes the identity from the backend response, not from the OAuth profile', async () => {
    mockBackend();

    const result = await jwtCallback({ token: {} as JWT, user, account: googleAccount() });

    expect(result.email).toBe('verified@example.com');
    expect(result.accessToken).toBe('acc');
  });
});
