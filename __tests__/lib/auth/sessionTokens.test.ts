// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { authOptions } from '@/lib/auth/config';
import type { Session } from 'next-auth';
import type { JWT } from 'next-auth/jwt';

/**
 * `LEGACY-446`: объект колбэка `session` уходит в браузер через `/api/auth/session`.
 * `refreshToken` в нём — кража сессии на весь срок refresh одним `fetch` из любого XSS.
 * `accessToken` и `error` остаются: ими живёт http-клиент браузера (решение арбитра
 * 08.10.2026, `decisions-log.md`).
 */

type SessionCallback = (params: { session: Session; token: JWT }) => Promise<Session>;

const { session: sessionCallback } = (
  authOptions as unknown as { callbacks: { session: SessionCallback } }
).callbacks;

describe('browser session tokens (LEGACY-446)', () => {
  it('does not expose refreshToken, keeps accessToken and error', async () => {
    const token = {
      id: 'u1',
      email: 'a@example.com',
      roles: ['user'],
      accessToken: 'acc',
      refreshToken: 'ref',
      accessTokenExpires: Date.now() + 60_000,
      error: 'RefreshAccessTokenError',
    } as JWT;

    const session = await sessionCallback({ session: { user: {} } as Session, token });

    expect(session).not.toHaveProperty('refreshToken');
    expect(session.accessToken).toBe('acc');
    expect(session.error).toBe('RefreshAccessTokenError');
  });
});
