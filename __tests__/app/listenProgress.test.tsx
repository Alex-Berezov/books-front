import { render, screen, act, cleanup, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ListenClient from '@/app/[lang]/book/[slug]/listen/ListenClient';
import { clearLocalProgress, readLocalProgress, saveLocalProgress } from '@/lib/reading-progress';

/**
 * Плеер: куда уходит позиция прослушивания и откуда она возвращается.
 *
 * 🔴 До этой задачи плеер не восстанавливал место вообще ни для кого — каждый
 * заход начинался с первой главы и нулевой секунды. Посадка держит оба
 * направления сразу: и что позиция сохраняется (анониму локально, вошедшему на
 * сервер), и что при возврате она применяется к нужной дорожке.
 *
 * 🔴 Перемотка живёт в том же эффекте, что и смена `audio.src`, и ждёт
 * `loadedmetadata`. Вынеси её отдельно — и при уже загруженной первой главе
 * перемотка ляжет на неё, а не на целевую: сохранённая 5-я глава на 12:30
 * откроется с нуля, и через пять секунд этот ноль уедет на сервер.
 */

const sessionState: { data: unknown; status: string } = { data: null, status: 'unauthenticated' };
const audioProgressMutate = vi.fn();
const serverProgressResult = {
  data: null as unknown,
  isLoading: false,
  isError: false,
};

vi.mock('next/navigation', () => ({
  usePathname: () => '/ru/book/hamlet/listen',
  useRouter: () => ({ back: vi.fn(), replace: vi.fn(), push: vi.fn() }),
}));

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

const FIRST_TRACK = 'https://cdn.test/1.mp3';
const SECOND_TRACK = 'https://cdn.test/2.mp3';

vi.mock('@/api/hooks/usePublicAudio', () => ({
  usePublicAudioChapters: () => ({
    data: {
      items: [
        { id: 'a1', number: 1, title: 'Первая', audioUrl: FIRST_TRACK, duration: 600 },
        { id: 'a2', number: 2, title: 'Вторая', audioUrl: SECOND_TRACK, duration: 600 },
      ],
    },
    isLoading: false,
    error: null,
  }),
  useRecordView: () => ({ mutate: vi.fn() }),
  useUpdateAudioProgress: () => ({ mutate: audioProgressMutate }),
}));

let currentTimeValue = 0;
/**
 * Метаданные первой дорожки успевают загрузиться, пока идёт слияние. Ровно этот
 * случай и ломал перемотку: она применялась к уже готовой первой главе.
 */
let readyStateValue = 0;

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
  Object.defineProperty(HTMLMediaElement.prototype, 'readyState', {
    configurable: true,
    get: () => readyStateValue,
  });
};

const getAudio = (): HTMLAudioElement => {
  const audio = document.querySelector('audio');
  if (!audio) throw new Error('audio element not rendered');
  return audio;
};

const fireTimeUpdate = (seconds: number) => {
  currentTimeValue = seconds;
  act(() => {
    fireEvent(getAudio(), new Event('timeupdate'));
  });
};

const fireLoadedMetadata = () => {
  act(() => {
    fireEvent(getAudio(), new Event('loadedmetadata'));
  });
};

describe('ListenClient: прогресс прослушивания', () => {
  beforeEach(() => {
    clearLocalProgress();
    audioProgressMutate.mockClear();
    currentTimeValue = 0;
    readyStateValue = 0;
    serverProgressResult.data = null;
    serverProgressResult.isLoading = false;
    serverProgressResult.isError = false;
    sessionState.data = null;
    sessionState.status = 'unauthenticated';
    defineMediaProps();
  });

  afterEach(() => {
    cleanup();
    clearLocalProgress();
  });

  const signIn = () => {
    sessionState.data = { user: { id: 'u1' } };
    sessionState.status = 'authenticated';
  };

  it('аноним пишет позицию локально, а не в закрытую ручку', () => {
    render(<ListenClient params={{ lang: 'ru', slug: 'hamlet' }} />);
    fireTimeUpdate(42);

    expect(audioProgressMutate).not.toHaveBeenCalled();
    expect(readLocalProgress('v-audio')?.audio).toMatchObject({ chapterNumber: 1, position: 42 });
  });

  it('вошедший пишет позицию на сервер и не оседает локально', () => {
    signIn();

    render(<ListenClient params={{ lang: 'ru', slug: 'hamlet' }} />);
    fireTimeUpdate(42);

    expect(audioProgressMutate).toHaveBeenCalledWith({ audioChapterNumber: 1, position: 42 });
    expect(readLocalProgress('v-audio')).toBeNull();
  });

  it('пока сессия грузится, позиция не пишется никуда', () => {
    sessionState.data = undefined;
    sessionState.status = 'loading';

    render(<ListenClient params={{ lang: 'ru', slug: 'hamlet' }} />);
    fireTimeUpdate(42);

    expect(audioProgressMutate).not.toHaveBeenCalled();
    expect(readLocalProgress('v-audio')).toBeNull();
  });

  /**
   * 🔴 Throttle — единственное, что отделяет одно сохранение в пять секунд от
   * запроса на каждый `timeupdate`, а браузер шлёт их десятками в секунду.
   */
  it('сохранение не чаще раза в пять секунд', () => {
    signIn();

    render(<ListenClient params={{ lang: 'ru', slug: 'hamlet' }} />);
    fireTimeUpdate(1);
    fireTimeUpdate(2);
    fireTimeUpdate(3);

    expect(audioProgressMutate).toHaveBeenCalledTimes(1);
  });

  it('аноним возвращается на сохранённые главу и секунду', () => {
    saveLocalProgress({
      versionId: 'v-audio',
      ownerId: null,
      kind: 'audio',
      chapterNumber: 2,
      position: 145,
    });

    render(<ListenClient params={{ lang: 'ru', slug: 'hamlet' }} />);

    expect(screen.getByText('Вторая')).toBeInTheDocument();
    fireLoadedMetadata();

    expect(currentTimeValue).toBe(145);
  });

  it('вошедший возвращается на серверные главу и секунду', () => {
    signIn();
    serverProgressResult.data = { audioChapterNumber: 2, position: 200 };

    render(<ListenClient params={{ lang: 'ru', slug: 'hamlet' }} />);

    expect(screen.getByText('Вторая')).toBeInTheDocument();
    fireLoadedMetadata();

    expect(currentTimeValue).toBe(200);
  });

  /**
   * 🔴 Тот самый сценарий, ради которого перемотка переехала в эффект смены
   * дорожки: метаданные первой главы уже загружены, а восстановить нужно пятую.
   * Перемотка обязана дождаться загрузки целевой дорожки, а не сработать сразу.
   */
  it('перемотка применяется к целевой дорожке, а не к уже загруженной первой', () => {
    readyStateValue = HTMLMediaElement.HAVE_METADATA;
    saveLocalProgress({
      versionId: 'v-audio',
      ownerId: null,
      kind: 'audio',
      chapterNumber: 2,
      position: 300,
    });

    render(<ListenClient params={{ lang: 'ru', slug: 'hamlet' }} />);

    const audio = getAudio();
    expect(audio.getAttribute('src') ?? audio.src).toContain(SECOND_TRACK);
    // До загрузки метаданных целевой дорожки позиция не тронута.
    expect(currentTimeValue).toBe(0);

    fireLoadedMetadata();

    expect(currentTimeValue).toBe(300);
  });

  /**
   * 🔴 Дорожку могли перезалить короче. Без ограничения по длительности плеер
   * уводит ползунок за конец файла и встаёт мёртво — для человека это выглядит
   * как сломанная книга.
   */
  it('позиция за концом дорожки обрезается до её длительности', () => {
    saveLocalProgress({
      versionId: 'v-audio',
      ownerId: null,
      kind: 'audio',
      chapterNumber: 1,
      position: 99999,
    });

    render(<ListenClient params={{ lang: 'ru', slug: 'hamlet' }} />);
    fireLoadedMetadata();

    expect(currentTimeValue).toBe(600);
  });

  it('серверный прогресс ещё грузится — до ответа ничего не сохраняем', () => {
    signIn();
    serverProgressResult.isLoading = true;

    render(<ListenClient params={{ lang: 'ru', slug: 'hamlet' }} />);
    fireTimeUpdate(42);

    expect(audioProgressMutate).not.toHaveBeenCalled();
  });

  /**
   * 🔴 Отказ запроса не равен «прогресса нет». На 503 место читателя неизвестно,
   * и сохранение обязано остаться закрытым: иначе через пять секунд
   * прослушивания с первой главы throttle затрёт настоящую двадцатую.
   */
  it('отказ запроса прогресса не открывает сохранение', () => {
    signIn();
    serverProgressResult.isError = true;

    render(<ListenClient params={{ lang: 'ru', slug: 'hamlet' }} />);
    fireTimeUpdate(42);

    expect(audioProgressMutate).not.toHaveBeenCalled();
    expect(readLocalProgress('v-audio')).toBeNull();
  });

  /**
   * 🔴 Слияние могло не пройти — тогда серверная запись пуста, а место в книге
   * цело только локально.
   */
  it('вошедший без серверного прогресса берёт локальную запись', () => {
    saveLocalProgress({
      versionId: 'v-audio',
      ownerId: null,
      kind: 'audio',
      chapterNumber: 2,
      position: 90,
    });
    signIn();

    render(<ListenClient params={{ lang: 'ru', slug: 'hamlet' }} />);

    expect(screen.getByText('Вторая')).toBeInTheDocument();
    fireLoadedMetadata();

    expect(currentTimeValue).toBe(90);
  });

  /**
   * 🔴 Общий компьютер: чужая запись не должна перематывать плеер на чужую
   * секунду, которую throttle потом запишет в чужой аккаунт.
   */
  it('чужая локальная запись не восстанавливается', () => {
    saveLocalProgress({
      versionId: 'v-audio',
      ownerId: 'someone-else',
      kind: 'audio',
      chapterNumber: 2,
      position: 300,
    });
    signIn();

    render(<ListenClient params={{ lang: 'ru', slug: 'hamlet' }} />);

    expect(screen.getByText('Первая')).toBeInTheDocument();
    fireLoadedMetadata();

    expect(currentTimeValue).toBe(0);
  });

  /**
   * 🔴 Слушатель успел выбрать главу сам, пока шло слияние. Уводить его с неё
   * нельзя, а сохранение при этом обязано открыться.
   */
  it('ручной выбор главы отменяет восстановление, но не сохранение', () => {
    saveLocalProgress({
      versionId: 'v-audio',
      ownerId: null,
      kind: 'audio',
      chapterNumber: 2,
      position: 300,
    });

    render(<ListenClient params={{ lang: 'ru', slug: 'hamlet' }} />);
    // Восстановление уже отработало — возвращаемся руками на первую главу.
    fireEvent.click(screen.getByLabelText('Предыдущая глава'));

    fireTimeUpdate(7);

    expect(readLocalProgress('v-audio')?.audio).toMatchObject({ chapterNumber: 1, position: 7 });
  });
});
