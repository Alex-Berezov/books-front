import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import * as navigation from 'next/navigation';
import * as nextAuth from 'next-auth/react';
import { describe, expect, it, vi } from 'vitest';
import SignInPage from '@/app/[lang]/auth/sign-in/page';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    refresh: vi.fn(),
  })),
  useSearchParams: vi.fn(() => ({
    get: vi.fn(),
  })),
}));

// Mock next-auth/react
vi.mock('next-auth/react', () => ({
  signIn: vi.fn(),
}));

// Mock matchMedia (required for Ant Design)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

describe('SignInPage', () => {
  it('renders login form', () => {
    render(<SignInPage />);

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    render(<SignInPage />);

    const submitButton = screen.getByRole('button', { name: /sign in/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/please enter your email/i)).toBeInTheDocument();
      expect(screen.getByText(/please enter your password/i)).toBeInTheDocument();
    });
  });

  it('calls signIn on valid submission', async () => {
    const signInMock = vi
      .spyOn(nextAuth, 'signIn')
      .mockResolvedValue({ ok: true, error: undefined, status: 200, url: '', code: undefined });
    const pushMock = vi.fn();

    vi.spyOn(navigation, 'useRouter').mockReturnValue({
      push: pushMock,
      refresh: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      replace: vi.fn(),
      prefetch: vi.fn(),
    });

    render(<SignInPage />);

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } });

    const submitButton = screen.getByRole('button', { name: /sign in/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(signInMock).toHaveBeenCalledWith('credentials', {
        redirect: false,
        email: 'test@example.com',
        password: 'password123',
        callbackUrl: '/admin/en', // Default callback
      });
      expect(pushMock).toHaveBeenCalledWith('/admin/en');
    });
  });
});
