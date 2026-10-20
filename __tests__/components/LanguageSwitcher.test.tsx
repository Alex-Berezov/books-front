import { render, screen, fireEvent } from '@testing-library/react';
import * as navigation from 'next/navigation';
import { afterEach, describe, it, expect, vi } from 'vitest';
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
const overview = vi.hoisted(() => ({ data: null as unknown }));
vi.mock('@/api/hooks/usePublic', () => ({
  useBookOverview: () => ({
    data: overview.data,
    isLoading: false,
  }),
}));

describe('LanguageSwitcher', () => {
  afterEach(() => {
    overview.data = null;
  });

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

  // Страница пересказа есть только у языков с пересказом: переключатель не ведёт в 404.
  it('на странице пересказа предлагает только языки с пересказом', () => {
    vi.spyOn(navigation, 'usePathname').mockReturnValue('/en/book/hamlet/summary');
    overview.data = {
      versions: [
        { language: 'en', slug: 'hamlet', _count: { summaries: 1 } },
        { language: 'es', slug: 'hamlet-es', _count: { summaries: 0 } },
        { language: 'fr', slug: 'hamlet-fr', _count: { summaries: 1 } },
      ],
    };

    render(<LanguageSwitcher />);
    fireEvent.click(screen.getByLabelText('Select language'));

    expect(screen.getByText(/FR/)).toBeInTheDocument();
    expect(screen.queryByText(/ES/)).not.toBeInTheDocument();
  });

  // F03-2: страница анализа - только языки с анализом (`product.md` §1.2), пересказ не в счёт.
  it('на странице анализа предлагает только языки с анализом', () => {
    vi.spyOn(navigation, 'usePathname').mockReturnValue('/en/book/hamlet/analysis');
    overview.data = {
      versions: [
        { language: 'en', slug: 'hamlet', _count: { summaries: 1, analyses: 1 } },
        { language: 'es', slug: 'hamlet-es', _count: { summaries: 1, analyses: 0 } },
        { language: 'fr', slug: 'hamlet-fr', _count: { summaries: 0, analyses: 1 } },
      ],
    };

    render(<LanguageSwitcher />);
    fireEvent.click(screen.getByLabelText('Select language'));

    expect(screen.getByText(/FR/)).toBeInTheDocument();
    expect(screen.queryByText(/ES/)).not.toBeInTheDocument();
  });

  // Счётчик языка страницы 0 при открытой странице (блок по другой стране): свой язык не пропадает.
  it('на странице анализа текущий язык есть и при нулевом счётчике', () => {
    vi.spyOn(navigation, 'usePathname').mockReturnValue('/en/book/hamlet/analysis');
    overview.data = {
      versions: [
        { language: 'en', slug: 'hamlet', _count: { summaries: 1, analyses: 0 } },
        { language: 'fr', slug: 'hamlet-fr', _count: { summaries: 0, analyses: 1 } },
      ],
    };

    render(<LanguageSwitcher />);
    fireEvent.click(screen.getByLabelText('Select language'));

    const options = screen.getAllByRole('option').map((o) => o.textContent ?? '');
    expect(options.some((text) => /EN/.test(text))).toBe(true);
    expect(options.some((text) => /FR/.test(text))).toBe(true);
  });

  it('на странице книги - все языки версий', () => {
    vi.spyOn(navigation, 'usePathname').mockReturnValue('/en/book/hamlet');
    overview.data = {
      versions: [
        { language: 'en', slug: 'hamlet', _count: { summaries: 1 } },
        { language: 'es', slug: 'hamlet-es', _count: { summaries: 0 } },
      ],
    };

    render(<LanguageSwitcher />);
    fireEvent.click(screen.getByLabelText('Select language'));

    expect(screen.getByText(/ES/)).toBeInTheDocument();
  });

  it('со страницы пересказа уводит на пересказ выбранного языка', () => {
    const pushMock = vi.fn();
    vi.spyOn(navigation, 'useRouter').mockReturnValue({
      push: pushMock,
      refresh: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      replace: vi.fn(),
      prefetch: vi.fn(),
    });
    vi.spyOn(navigation, 'usePathname').mockReturnValue('/en/book/hamlet/summary');
    overview.data = {
      versions: [
        { language: 'en', slug: 'hamlet', _count: { summaries: 1 } },
        { language: 'fr', slug: 'hamlet-fr', _count: { summaries: 1 } },
      ],
    };

    render(<LanguageSwitcher />);
    fireEvent.click(screen.getByLabelText('Select language'));
    fireEvent.click(screen.getByText(/FR/));

    expect(pushMock).toHaveBeenCalledTimes(1);
    expect(pushMock).toHaveBeenCalledWith('/fr/book/hamlet-fr/summary');
  });

  it('на странице пересказа без счётчиков - только текущий язык', () => {
    vi.spyOn(navigation, 'usePathname').mockReturnValue('/en/book/hamlet/summary');
    overview.data = {
      versions: [
        { language: 'en', slug: 'hamlet' },
        { language: 'fr', slug: 'x' },
      ],
    };

    render(<LanguageSwitcher />);
    fireEvent.click(screen.getByLabelText('Select language'));

    expect(screen.queryByText(/FR/)).not.toBeInTheDocument();
  });

  // F04-3 `product.md` §5: раздел пересказа ведёт на `/summary` другого языка - пары разделов нет.
  it.each([
    ['со слагом целевой версии', 'hamlet-fr', '/fr/book/hamlet-fr/summary'],
    ['без слага целевой версии', undefined, '/fr/book/hamlet/summary'],
  ])(
    'со страницы раздела /summary/3 - на /summary другого языка, %s',
    (_name, frSlug, expected) => {
      const pushMock = vi.fn();
      vi.spyOn(navigation, 'useRouter').mockReturnValue({
        push: pushMock,
        refresh: vi.fn(),
        back: vi.fn(),
        forward: vi.fn(),
        replace: vi.fn(),
        prefetch: vi.fn(),
      });
      vi.spyOn(navigation, 'usePathname').mockReturnValue('/en/book/hamlet/summary/3');
      overview.data = {
        versions: [
          { language: 'en', slug: 'hamlet', _count: { summaries: 1 } },
          { language: 'fr', slug: frSlug, _count: { summaries: 1 } },
        ],
      };

      render(<LanguageSwitcher />);
      fireEvent.click(screen.getByLabelText('Select language'));
      fireEvent.click(screen.getByText(/FR/));

      expect(pushMock).toHaveBeenCalledWith(expected);
    }
  );
});
