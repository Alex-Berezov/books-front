import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PageBackButton } from '@/components/public/navigation';

const pushMock = vi.fn();
const backMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, back: backMock }),
  usePathname: () => '/en/category/philosophy',
}));

const STORAGE_KEY_PREVIOUS = 'bibliaris.previousPath';

describe('PageBackButton', () => {
  beforeEach(() => {
    pushMock.mockClear();
    backMock.mockClear();
    sessionStorage.clear();
  });

  it('renders the localized label', () => {
    render(<PageBackButton lang="ru" />);
    expect(screen.getByRole('button', { name: /Назад/ })).toBeInTheDocument();
  });

  it('falls back to English for an unsupported language', () => {
    render(<PageBackButton lang="de" />);
    expect(screen.getByRole('button', { name: /Back/ })).toBeInTheDocument();
  });

  it('navigates to the tracked previous internal path', () => {
    sessionStorage.setItem(STORAGE_KEY_PREVIOUS, '/en/catalog?page=2');

    render(<PageBackButton lang="en" />);
    fireEvent.click(screen.getByRole('button'));

    expect(pushMock).toHaveBeenCalledWith('/en/catalog?page=2');
    expect(backMock).not.toHaveBeenCalled();
  });

  it('ignores a previous path equal to the current one', () => {
    sessionStorage.setItem(STORAGE_KEY_PREVIOUS, '/en/category/philosophy');

    render(<PageBackButton lang="en" />);
    fireEvent.click(screen.getByRole('button'));

    expect(pushMock).not.toHaveBeenCalledWith('/en/category/philosophy');
  });

  it('uses browser history when no previous path was tracked', () => {
    const historySpy = vi.spyOn(window.history, 'length', 'get').mockReturnValue(3);

    render(<PageBackButton lang="en" />);
    fireEvent.click(screen.getByRole('button'));

    expect(backMock).toHaveBeenCalled();
    expect(pushMock).not.toHaveBeenCalled();

    historySpy.mockRestore();
  });

  it('uses the fallback href when there is no history to go back to', () => {
    const historySpy = vi.spyOn(window.history, 'length', 'get').mockReturnValue(1);

    render(<PageBackButton lang="en" fallbackHref="/en/book/war-and-peace" />);
    fireEvent.click(screen.getByRole('button'));

    expect(backMock).not.toHaveBeenCalled();
    expect(pushMock).toHaveBeenCalledWith('/en/book/war-and-peace');

    historySpy.mockRestore();
  });

  it('defaults the fallback href to the language home page', () => {
    const historySpy = vi.spyOn(window.history, 'length', 'get').mockReturnValue(1);

    render(<PageBackButton lang="fr" />);
    fireEvent.click(screen.getByRole('button'));

    expect(pushMock).toHaveBeenCalledWith('/fr');

    historySpy.mockRestore();
  });
});
