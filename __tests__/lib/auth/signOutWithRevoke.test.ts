import { beforeEach, describe, expect, it, vi } from 'vitest';
import { signOutWithRevoke } from '@/lib/auth/sign-out';

const calls: string[] = [];

const { revokeMock, signOutMock, clearMarkerMock } = vi.hoisted(() => ({
  revokeMock: vi.fn(),
  signOutMock: vi.fn(),
  clearMarkerMock: vi.fn(),
}));

vi.mock('@/lib/auth/revoke-sessions.action', () => ({
  revokeBackendSessionsAction: revokeMock,
}));
vi.mock('@/lib/auth/sessionMarker', () => ({ clearLoggedInMarker: clearMarkerMock }));
vi.mock('next-auth/react', () => ({ signOut: signOutMock }));

/**
 * `LEGACY-451`, `T122`: выход по кнопке — отзыв сессий на бэкенде, потом маркер входа, потом
 * кука. Одно место на все кнопки (`lib/auth/sign-out.ts`).
 */
describe('signOutWithRevoke (LEGACY-451)', () => {
  beforeEach(() => {
    calls.length = 0;
    revokeMock.mockReset().mockImplementation(async () => {
      calls.push('revoke');
    });
    clearMarkerMock.mockReset().mockImplementation(() => {
      calls.push('marker');
    });
    signOutMock.mockReset().mockImplementation(async () => {
      calls.push('signOut');
    });
  });

  it('порядок: отзыв сессий, маркер, выход', async () => {
    await signOutWithRevoke('/en');

    expect(calls).toEqual(['revoke', 'marker', 'signOut']);
    expect(signOutMock).toHaveBeenCalledTimes(1);
    expect(signOutMock).toHaveBeenCalledWith({ callbackUrl: '/en' });
  });

  it('отказ отзыва выход не блокирует', async () => {
    revokeMock.mockRejectedValueOnce(new Error('server action failed'));

    await signOutWithRevoke('/en');

    expect(calls).toEqual(['marker', 'signOut']);
  });
});
