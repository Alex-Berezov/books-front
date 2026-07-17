import { render, screen, fireEvent } from '@testing-library/react';
import * as navigation from 'next/navigation';
import { describe, it, expect, vi } from 'vitest';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(),
  useRouter: vi.fn(() => ({
    push: vi.fn(),
  })),
}));

// Mock language options
vi.mock('@/lib/i18n/languageSelectOptions', () => ({
  getLanguageSelectOptions: () => [
    { value: 'en', label: 'English' },
    { value: 'es', label: 'Español' },
    { value: 'fr', label: 'Français' },
    { value: 'pt', label: 'Português' },
  ],
}));

// Mock useBookOverview hook
vi.mock('@/api/hooks/usePublic', () => ({
  useBookOverview: () => ({
    data: null,
    isLoading: false,
  }),
}));

describe('LanguageSwitcher', () => {
  it('renders and opens language dropdown', () => {
    vi.spyOn(navigation, 'usePathname').mockReturnValue('/en/dashboard');

    render(<LanguageSwitcher />);

    const trigger = screen.getByLabelText('Select language');
    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText(/ES/)).toBeInTheDocument();
    expect(screen.getByText(/FR/)).toBeInTheDocument();
  });

  it('switches language on option click', () => {
    const pushMock = vi.fn();
    vi.spyOn(navigation, 'useRouter').mockReturnValue({
      push: pushMock,
      refresh: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      replace: vi.fn(),
      prefetch: vi.fn(),
    });
    vi.spyOn(navigation, 'usePathname').mockReturnValue('/en/dashboard');

    render(<LanguageSwitcher />);

    const trigger = screen.getByLabelText('Select language');
    fireEvent.click(trigger);

    const esOption = screen.getByText(/ES/);
    fireEvent.click(esOption);

    expect(pushMock).toHaveBeenCalledWith('/es/dashboard');
  });
});
