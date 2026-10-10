import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminTopBar } from '@/components/admin/AdminShell/AdminTopBar/AdminTopBar';

const { signOutWithRevokeMock } = vi.hoisted(() => ({ signOutWithRevokeMock: vi.fn() }));

vi.mock('@/lib/auth/sign-out', () => ({ signOutWithRevoke: signOutWithRevokeMock }));

vi.mock('@/components/admin/AdminShell/AdminTopBar/AdminLanguageSwitcher', () => ({
  AdminLanguageSwitcher: () => null,
}));
vi.mock(
  '@/components/admin/AdminShell/AdminTopBar/RightsNotificationsBell/RightsNotificationsBell',
  () => ({ RightsNotificationsBell: () => null })
);
vi.mock('@/components/admin/AdminShell/PurgeCacheButton/PurgeCacheButton', () => ({
  PurgeCacheButton: () => null,
}));

/**
 * `LEGACY-451`, `T122`: кнопка выхода админки идёт через общий выход с отзывом сессий
 * (`lib/auth/sign-out.ts`), а не через голый `signOut` — порядок держит одна функция.
 */
describe('кнопка выхода админки (LEGACY-451)', () => {
  beforeEach(() => {
    signOutWithRevokeMock.mockReset().mockResolvedValue(undefined);
  });

  it('выход — через общий выход с отзывом сессий', () => {
    render(<AdminTopBar userEmail="admin@example.com" userName="Admin" />);
    fireEvent.click(screen.getByRole('button', { name: /log ?out|sign ?out|выйти/i }));

    expect(signOutWithRevokeMock).toHaveBeenCalledTimes(1);
    expect(signOutWithRevokeMock).toHaveBeenCalledWith('/en/auth/sign-in');
  });
});
