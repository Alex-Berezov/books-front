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

describe('ReaderClient — 451 from the backend (WP-1.6)', () => {
  beforeEach(() => {
    readerBootstrapResult.data = undefined;
    readerBootstrapResult.isLoading = false;
    readerBootstrapResult.error = null;
  });

  it('replaces the reader with the rights notice when reader-bootstrap answers 451', () => {
    readerBootstrapResult.error = new ApiError({
      message: 'Content is not available in your country due to rights restrictions.',
      statusCode: 451,
      data: { code: 'GEO_BLOCKED_BY_RIGHTS', countryCode: 'GB', scope: 'TEXT_READER' },
    });

    render(<ReaderClient params={{ lang: 'ru', slug: 'hamlet' }} />);

    expect(screen.getByText('Недоступно в вашем регионе')).toBeInTheDocument();
    // The reader chrome must not render at all — no table of contents, no settings.
    expect(screen.queryByLabelText('Оглавление')).not.toBeInTheDocument();
  });

  it('keeps the ordinary empty state for a book that simply has no chapters', () => {
    readerBootstrapResult.data = { versionId: 'v1', slug: 'hamlet', title: 'Hamlet', chapters: [] };

    render(<ReaderClient params={{ lang: 'ru', slug: 'hamlet' }} />);

    expect(screen.queryByText('Недоступно в вашем регионе')).not.toBeInTheDocument();
  });
});
