import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ListenClient from '@/app/[lang]/book/[slug]/listen/ListenClient';
import { ApiError } from '@/types/api';

const audioChaptersResult = {
  data: undefined as unknown,
  isLoading: false,
  error: null as unknown,
};

vi.mock('next/navigation', () => ({
  usePathname: () => '/ru/book/hamlet/listen',
  useRouter: () => ({ back: vi.fn(), replace: vi.fn(), push: vi.fn() }),
}));

// Плеер открыт анониму, а сессию спрашивает, чтобы не бить прогрессом в
// `PUT /me/progress/:versionId` без токена. Без мока `useSession` требует
// `<SessionProvider/>` и роняет рендер — тот же мок стоит в соседнем
// `readerRightsBlocked.test.tsx`.
vi.mock('next-auth/react', () => ({
  useSession: () => ({ data: null }),
}));

vi.mock('@/api/hooks/usePublic', () => ({
  useBookOverview: () => ({
    // The book card itself stays available in a blocked market — only listening is refused.
    data: { slug: 'hamlet', title: 'Hamlet', versionIds: { audio: 'v-audio' } },
    isLoading: false,
  }),
}));

vi.mock('@/api/hooks/usePublicAudio', () => ({
  usePublicAudioChapters: () => audioChaptersResult,
  useRecordView: () => ({ mutate: vi.fn() }),
  useUpdateAudioProgress: () => ({ mutate: vi.fn() }),
}));

describe('ListenClient — 451 from the backend (WP-1.6)', () => {
  beforeEach(() => {
    audioChaptersResult.data = undefined;
    audioChaptersResult.isLoading = false;
    audioChaptersResult.error = null;
  });

  it('replaces the player with the rights notice when audio-chapters answers 451', () => {
    audioChaptersResult.error = new ApiError({
      message: 'Content is not available in your country due to rights restrictions.',
      statusCode: 451,
      data: { code: 'GEO_BLOCKED_BY_RIGHTS', countryCode: 'GB', scope: 'AUDIO' },
    });

    render(<ListenClient params={{ lang: 'ru', slug: 'hamlet' }} />);

    expect(screen.getByText('Недоступно в вашем регионе')).toBeInTheDocument();
    expect(screen.queryByText('Не удалось загрузить аудиоглавы.')).not.toBeInTheDocument();
  });

  it('leaves the ordinary failure path untouched for any other error', () => {
    audioChaptersResult.error = new ApiError({ message: 'boom', statusCode: 500 });

    render(<ListenClient params={{ lang: 'ru', slug: 'hamlet' }} />);

    expect(screen.queryByText('Недоступно в вашем регионе')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Назад' })).toBeInTheDocument();
  });
});
