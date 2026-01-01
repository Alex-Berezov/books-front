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

// Mock language options to return simple strings instead of React Nodes
// This avoids "<span> cannot appear as a child of <option>" warning
vi.mock('@/lib/i18n/languageSelectOptions', () => ({
  getLanguageSelectOptions: () => [
    { value: 'en', label: 'English' },
    { value: 'es', label: 'Español' },
    { value: 'fr', label: 'Français' },
    { value: 'pt', label: 'Português' },
  ],
}));

// Mock Ant Design Select
vi.mock('antd', async (importOriginal) => {
  const actual = await importOriginal<typeof import('antd')>();
  return {
    ...actual,
    Select: ({
      onChange,
      value,
      options,
      'aria-label': ariaLabel,
    }: {
      onChange: (val: string) => void;
      value: string;
      options: Array<{ value: string; label: string }>;
      'aria-label'?: string;
    }) => (
      <select aria-label={ariaLabel} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    ),
  };
});

describe('LanguageSwitcher', () => {
  it('renders language options', () => {
    vi.spyOn(navigation, 'usePathname').mockReturnValue('/en/dashboard');

    render(<LanguageSwitcher />);

    // Check if the select is rendered
    const select = screen.getByLabelText('Select language');
    expect(select).toBeInTheDocument();

    // Check if options are present (English, Español, etc.)
    // Note: In our mock, label is rendered as text inside option
    expect(screen.getByText(/English/)).toBeInTheDocument();
  });

  it('switches language on selection', () => {
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

    const select = screen.getByLabelText('Select language');
    fireEvent.change(select, { target: { value: 'es' } });

    expect(pushMock).toHaveBeenCalledWith('/es/dashboard');
  });
});
