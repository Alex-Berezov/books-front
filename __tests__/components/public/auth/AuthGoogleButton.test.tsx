import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthGoogleButton } from '@/components/public/auth';

const calls: string[] = [];

vi.mock('next-auth/react', () => ({
  signIn: vi.fn((provider: string, options: { callbackUrl: string }) => {
    calls.push(`signIn:${provider}:${options.callbackUrl}`);
  }),
}));

vi.mock('@/lib/auth/sessionMarker', () => ({
  markLoggedIn: vi.fn(() => calls.push('markLoggedIn')),
}));

/**
 * Кнопка Google общая для входа и регистрации (F01-6). Отметка входа ставится до ухода на Google:
 * браузер вернётся уже на `callbackUrl`, и код после `signIn` не выполнится (LEGACY-075).
 */
describe('AuthGoogleButton', () => {
  beforeEach(() => {
    calls.length = 0;
  });

  it('сообщает о начале, ставит отметку входа и уходит на Google с адресом на момент нажатия', () => {
    let target = '/en';
    const onStart = vi.fn(() => calls.push('onStart'));
    render(<AuthGoogleButton disabled={false} onStart={onStart} getCallbackUrl={() => target} />);

    target = '/ru/bookshelf';
    fireEvent.click(screen.getByRole('button', { name: /Google/ }));

    expect(calls).toEqual(['onStart', 'markLoggedIn', 'signIn:google:/ru/bookshelf']);
  });

  it('занятая форма не уходит на Google', () => {
    render(<AuthGoogleButton disabled onStart={vi.fn()} getCallbackUrl={() => '/en'} />);
    fireEvent.click(screen.getByRole('button', { name: /Google/ }));
    expect(calls).toEqual([]);
  });
});
