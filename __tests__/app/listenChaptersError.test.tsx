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

vi.mock('next-auth/react', () => ({
  useSession: () => ({ data: null }),
}));

vi.mock('@/api/hooks/useProgress', () => ({
  useProgress: () => ({ data: undefined, isLoading: false }),
}));

vi.mock('@/api/hooks/usePublic', () => ({
  useBookOverview: () => ({
    data: { slug: 'hamlet', title: 'Hamlet', versionIds: { audio: 'v-audio' } },
    isLoading: false,
  }),
}));

vi.mock('@/api/hooks/usePublicAudio', () => ({
  usePublicAudioChapters: () => audioChaptersResult,
  useRecordView: () => ({ mutate: vi.fn() }),
  useUpdateAudioProgress: () => ({ mutate: vi.fn() }),
}));

/**
 * LEGACY-268. `chapters.length === 0` проверялась в тексте сообщения раньше
 * отказа, а при отказе `chapters` тоже всегда пуст (запрос не вернул данные) —
 * то есть `player.chaptersFail` был практически недостижим, читатель всегда
 * видел «нет глав», даже когда сервер отдал 500.
 */
describe('ListenClient — отказ загрузки глав отличим от честно пустого списка', () => {
  beforeEach(() => {
    audioChaptersResult.data = undefined;
    audioChaptersResult.isLoading = false;
    audioChaptersResult.error = null;
  });

  it('500 от audio-chapters показывает текст об ошибке загрузки', () => {
    audioChaptersResult.error = new ApiError({ message: 'boom', statusCode: 500 });

    render(<ListenClient params={{ lang: 'ru', slug: 'hamlet' }} />);

    expect(
      screen.getByText('Не удалось загрузить аудиоглавы. Возможно, версия ещё не опубликована.')
    ).toBeInTheDocument();
    expect(screen.queryByText('У этой аудиокниги пока нет глав.')).not.toBeInTheDocument();
  });

  it('честно пустой список глав по-прежнему показывает «нет глав»', () => {
    audioChaptersResult.error = null;
    audioChaptersResult.data = { items: [] };

    render(<ListenClient params={{ lang: 'ru', slug: 'hamlet' }} />);

    expect(screen.getByText('У этой аудиокниги пока нет глав.')).toBeInTheDocument();
    expect(
      screen.queryByText('Не удалось загрузить аудиоглавы. Возможно, версия ещё не опубликована.')
    ).not.toBeInTheDocument();
  });
});
