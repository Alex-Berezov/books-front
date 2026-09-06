import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ReaderClient from '@/app/[lang]/book/[slug]/read/ReaderClient';
import { ApiError } from '@/types/api';

const readerBootstrapResult = {
  data: undefined as unknown,
  isLoading: false,
  error: null as unknown,
};

vi.mock('next/navigation', () => ({
  usePathname: () => '/ru/book/hamlet/read',
  useRouter: () => ({ back: vi.fn(), replace: vi.fn(), push: vi.fn() }),
}));

vi.mock('next-auth/react', () => ({
  useSession: () => ({ data: null }),
}));

vi.mock('@/api/hooks/usePublic', () => ({
  useReaderBootstrap: () => readerBootstrapResult,
}));

vi.mock('@/api/hooks/useProgress', () => ({
  useUpdateTextProgress: () => ({ mutate: vi.fn() }),
}));

/**
 * LEGACY-268. До правки только `isRightsBlockedError` отличался от «пусто»:
 * 404 на опечатку в слаге или 500 от `reader-bootstrap` доезжали до общего рендера
 * с пустым `chapters` и показывали то же самое «нет глав», что и честно пустая
 * книга — отличить отказ от загрузки посетитель не мог.
 */
describe('ReaderClient — отказ бутстрапа отличим от честно пустой книги', () => {
  beforeEach(() => {
    readerBootstrapResult.data = undefined;
    readerBootstrapResult.isLoading = false;
    readerBootstrapResult.error = null;
  });

  it('500 от reader-bootstrap показывает текст об ошибке, а не «нет глав»', () => {
    readerBootstrapResult.error = new ApiError({ message: 'Internal error', statusCode: 500 });

    render(<ReaderClient params={{ lang: 'ru', slug: 'hamlet' }} />);

    expect(screen.getByText('Не удалось загрузить книгу. Попробуйте позже.')).toBeInTheDocument();
    expect(screen.queryByText('Для этой версии книги нет доступных глав.')).not.toBeInTheDocument();
  });

  it('404 на опечатку в слаге тоже показывает текст об ошибке', () => {
    readerBootstrapResult.error = new ApiError({ message: 'Not found', statusCode: 404 });

    render(<ReaderClient params={{ lang: 'ru', slug: 'hamlett' }} />);

    expect(screen.getByText('Не удалось загрузить книгу. Попробуйте позже.')).toBeInTheDocument();
  });

  it('честно пустая книга по-прежнему показывает «нет глав»', () => {
    readerBootstrapResult.data = { versionId: 'v1', slug: 'hamlet', title: 'Hamlet', chapters: [] };

    render(<ReaderClient params={{ lang: 'ru', slug: 'hamlet' }} />);

    expect(screen.getByText('Для этой версии книги нет доступных глав.')).toBeInTheDocument();
    expect(
      screen.queryByText('Не удалось загрузить книгу. Попробуйте позже.')
    ).not.toBeInTheDocument();
  });
});
