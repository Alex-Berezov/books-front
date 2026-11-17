import { render, screen, act, cleanup, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ListenClient from '@/app/[lang]/book/[slug]/listen/ListenClient';
import { clearLocalProgress, readLocalProgress, saveLocalProgress } from '@/lib/reading-progress';

/**
 * Плеер по ссылке `?chapter=N` («Слушать» у сцены мира книги, решение `F08 | F08-3` Q6).
 *
 * 🔴 Глава из ссылки выигрывает у сохранённого места и открывается с нуля: без этого ссылка
 * со сцены вела бы на ту главу, где слушатель остановился в прошлый раз, а не на сцену.
 * Неизвестный номер или мусор в параметре - обычное восстановление, как без ссылки.
 */

vi.mock('next/navigation', () => ({
  usePathname: () => '/ru/book/hamlet/listen',
  useRouter: () => ({ back: vi.fn(), replace: vi.fn(), push: vi.fn() }),
}));

const sessionState: { data: unknown; status: string } = { data: null, status: 'unauthenticated' };
const serverProgressResult = { data: null as unknown, isLoading: false, isError: false };

vi.mock('next-auth/react', () => ({
  useSession: () => sessionState,
}));

vi.mock('@/api/hooks/usePublic', () => ({
  useBookOverview: () => ({
    data: { slug: 'hamlet', title: 'Hamlet', versionIds: { audio: 'v-audio' } },
    isLoading: false,
  }),
}));

vi.mock('@/api/hooks/useProgress', () => ({
  useProgress: () => serverProgressResult,
}));

const SECOND_TRACK = 'https://cdn.test/2.mp3';
const SKIP_BACK_LABEL = 'Назад на 15 секунд';

vi.mock('@/api/hooks/usePublicAudio', () => ({
  usePublicAudioChapters: () => ({
    data: {
      items: [
        { id: 'a1', number: 1, title: 'Первая', audioUrl: 'https://cdn.test/1.mp3', duration: 600 },
        { id: 'a2', number: 2, title: 'Вторая', audioUrl: 'https://cdn.test/2.mp3', duration: 600 },
        { id: 'a3', number: 3, title: 'Третья', audioUrl: 'https://cdn.test/3.mp3', duration: 600 },
      ],
    },
    isLoading: false,
    error: null,
  }),
  useRecordView: () => ({ mutate: vi.fn() }),
  useUpdateAudioProgress: () => ({ mutate: vi.fn() }),
}));

let currentTimeValue = 0;

const defineMediaProps = () => {
  Object.defineProperty(HTMLMediaElement.prototype, 'currentTime', {
    configurable: true,
    get: () => currentTimeValue,
    set: (value: number) => {
      currentTimeValue = value;
    },
  });
  Object.defineProperty(HTMLMediaElement.prototype, 'duration', {
    configurable: true,
    get: () => 600,
  });
};

const getAudio = (): HTMLAudioElement => {
  const audio = document.querySelector('audio');
  if (!audio) throw new Error('audio element not rendered');
  return audio;
};

const fireLoadedMetadata = () => {
  act(() => {
    fireEvent(getAudio(), new Event('loadedmetadata'));
  });
};

/** Дорожка дошла до секунды `seconds` - браузер шлёт `timeupdate`. */
const fireTimeUpdate = (seconds: number) => {
  currentTimeValue = seconds;
  act(() => {
    fireEvent(getAudio(), new Event('timeupdate'));
  });
};

const openAt = (search: string) => {
  window.history.replaceState(null, '', `/ru/book/hamlet/listen${search}`);
};

/** Слушатель остановился на третьей главе, на 145-й секунде. */
const saveThirdChapter = () =>
  saveLocalProgress({
    versionId: 'v-audio',
    ownerId: null,
    kind: 'audio',
    chapterNumber: 3,
    position: 145,
  });

describe('ListenClient: глава из ссылки ?chapter=N', () => {
  beforeEach(() => {
    clearLocalProgress();
    sessionState.data = null;
    sessionState.status = 'unauthenticated';
    serverProgressResult.data = null;
    serverProgressResult.isLoading = false;
    serverProgressResult.isError = false;
    currentTimeValue = 0;
    defineMediaProps();
  });

  afterEach(() => {
    cleanup();
    clearLocalProgress();
    window.history.replaceState(null, '', '/');
  });

  it('глава из ссылки выигрывает у сохранённого места и открывается с нуля', () => {
    saveThirdChapter();
    openAt('?chapter=2');

    render(<ListenClient params={{ lang: 'ru', slug: 'hamlet' }} />);

    expect(screen.getByText('Вторая')).toBeInTheDocument();
    const audio = getAudio();
    expect(audio.getAttribute('src') ?? audio.src).toContain(SECOND_TRACK);
    fireLoadedMetadata();
    expect(currentTimeValue).toBe(0);
  });

  it('параметр снимается с адреса: перезагрузка не уводит снова на главу из ссылки', () => {
    saveThirdChapter();
    openAt('?chapter=2&utm=world');

    render(<ListenClient params={{ lang: 'ru', slug: 'hamlet' }} />);

    expect(window.location.search).toBe('?utm=world');
  });

  it.each(['?chapter=9', '?chapter=abc', '?chapter=0'])(
    'неизвестный номер или мусор (%s) - восстановлено сохранённое место',
    (search) => {
      saveThirdChapter();
      openAt(search);

      render(<ListenClient params={{ lang: 'ru', slug: 'hamlet' }} />);

      expect(screen.getByText('Третья')).toBeInTheDocument();
      fireLoadedMetadata();
      expect(currentTimeValue).toBe(145);
    }
  );

  const signIn = () => {
    sessionState.data = { user: { id: 'u1' } };
    sessionState.status = 'authenticated';
  };

  // 🔴 Глава из ссылки не ждёт прогресса: 503 на нём держит закрытым восстановление и сохранение,
  // но не выбор главы - иначе «Слушать» у сцены открывал бы главу 1.
  it('503 на прогрессе вошедшего - открыта глава из ссылки', () => {
    signIn();
    serverProgressResult.isError = true;
    openAt('?chapter=2');

    render(<ListenClient params={{ lang: 'ru', slug: 'hamlet' }} />);

    expect(screen.getByText('Вторая')).toBeInTheDocument();
    expect(window.location.search).toBe('');
  });

  it('play до прихода прогресса не сбрасывает главу из ссылки, пришедший прогресс её не перебивает', () => {
    signIn();
    serverProgressResult.isLoading = true;
    openAt('?chapter=2');

    const { rerender } = render(<ListenClient params={{ lang: 'ru', slug: 'hamlet' }} />);
    fireEvent.click(screen.getByRole('button', { name: /play|воспроизв/i }));
    expect(screen.getByText('Вторая')).toBeInTheDocument();

    serverProgressResult.isLoading = false;
    serverProgressResult.data = { audioChapterNumber: 3, position: 145 };
    rerender(<ListenClient params={{ lang: 'ru', slug: 'hamlet' }} />);

    expect(screen.getByText('Вторая')).toBeInTheDocument();
    expect(screen.queryByText('Третья')).toBeNull();
    fireLoadedMetadata();
    expect(currentTimeValue).toBe(0);
  });

  // 🔴 Ссылка - послушать сцену, а не переложить закладку (как `openedFromLinkRef` читалки):
  // play по главе из ссылки место не пишет, его открывает только собственный выбор места -
  // смена главы или перемотка.
  it('через 5 с прослушивания после открытия по ссылке место не пишется', () => {
    saveThirdChapter();
    openAt('?chapter=2');

    render(<ListenClient params={{ lang: 'ru', slug: 'hamlet' }} />);
    fireEvent.click(screen.getByRole('button', { name: /play|воспроизв/i }));
    fireTimeUpdate(5);
    fireTimeUpdate(11);

    expect(readLocalProgress('v-audio', null)?.audio).toMatchObject({
      chapterNumber: 3,
      position: 145,
    });
  });

  it('после смены главы слушателем место пишется', () => {
    saveThirdChapter();
    openAt('?chapter=2');

    render(<ListenClient params={{ lang: 'ru', slug: 'hamlet' }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Предыдущая глава' }));
    fireTimeUpdate(7);

    expect(readLocalProgress('v-audio', null)?.audio).toMatchObject({
      chapterNumber: 1,
      position: 7,
    });
  });
  // Решение арбитра 17.11.2026 `F08 | F08-3b` (автопереход плеера): дослушал главу из ссылки и
  // остался в книге - он уже в следующей главе, место дальше пишется (как закладка читалки после
  // перехода на другую главу).
  it('дослушал главу из ссылки до конца - на следующей главе место пишется', () => {
    saveThirdChapter();
    openAt('?chapter=1');

    render(<ListenClient params={{ lang: 'ru', slug: 'hamlet' }} />);
    act(() => {
      fireEvent(getAudio(), new Event('ended'));
    });
    fireTimeUpdate(7);

    expect(readLocalProgress('v-audio', null)?.audio).toMatchObject({
      chapterNumber: 2,
      position: 7,
    });
  });

  it('перемотка слушателем после ссылки открывает сохранение', () => {
    saveThirdChapter();
    openAt('?chapter=2');

    render(<ListenClient params={{ lang: 'ru', slug: 'hamlet' }} />);
    fireEvent.click(screen.getByRole('button', { name: SKIP_BACK_LABEL }));
    fireTimeUpdate(9);

    expect(readLocalProgress('v-audio', null)?.audio).toMatchObject({
      chapterNumber: 2,
      position: 9,
    });
  });
});
