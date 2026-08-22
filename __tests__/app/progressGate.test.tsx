import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ReaderClient from '@/app/[lang]/book/[slug]/read/ReaderClient';
import { clearLocalProgress, readLocalProgress, saveLocalProgress } from '@/lib/reading-progress';
import { useProgressTarget } from '@/lib/reading-progress/useProgressTarget';

/**
 * Чтение открыто анониму, а `PUT /me/progress/:versionId` требует токена.
 *
 * 🔴 Посадка на оба направления сразу. Уберут проверку — аноним снова начнёт
 * бить в закрытую ручку на каждой смене главы: 401 из `getAccessToken`,
 * а при малейшей перестановке кода в `httpPutAuth` тот же 401 уходит в
 * `handleAuthFailure` и выбрасывает читателя на форму входа. Проверят вместо
 * сессии что-нибудь другое — вошедший молча перестанет накапливать прогресс,
 * и не заметит этого никто, потому что ошибки при этом нет.
 *
 * 🔴 Третий исход, `'unknown'`, посажен отдельно. Пока сессия грузится, писать
 * нельзя **никуда**: положишь главу в `localStorage` за вошедшего — слияние
 * увидит её как самую свежую запись и откатит человека назад по книге.
 */

const sessionState: { data: unknown; status: string } = { data: null, status: 'unauthenticated' };
const mutate = vi.fn();

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
  useSession: () => sessionState,
}));

vi.mock('@/api/hooks/usePublic', () => ({
  useReaderBootstrap: () => readerBootstrapResult,
}));

vi.mock('@/api/hooks/useProgress', () => ({
  useUpdateTextProgress: () => ({ mutate }),
}));

// Слияние управляется вручную: сценарий «читатель успел раньше» иначе не поставить.
const syncState = { isSettled: true };

vi.mock('@/lib/reading-progress/ProgressSyncProvider', async (importOriginal) => {
  const actual = await importOriginal<object>();
  return { ...actual, useProgressSync: () => syncState };
});

const settleLater = () => {
  syncState.isSettled = false;
};

const releaseSettle = () => {
  act(() => {
    syncState.isSettled = true;
  });
};

const twoChapters = {
  versionId: 'v1',
  slug: 'hamlet',
  title: 'Hamlet',
  chapters: [
    { id: 'c1', number: 1, title: 'Первая', content: '<p>1</p>' },
    { id: 'c2', number: 2, title: 'Вторая', content: '<p>2</p>' },
  ],
};

describe('useProgressTarget', () => {
  const cases: Array<[string, unknown, string, string]> = [
    ['аноним', null, 'unauthenticated', 'local'],
    ['сессия ещё грузится', undefined, 'loading', 'unknown'],
    ['вошедший', { user: { id: 'u1' } }, 'authenticated', 'server'],
    // Токен протух и обновиться не смог: `session.user` на месте, но запрос
    // получит 401 и уведёт пользователя на форму входа принудительным выходом.
    [
      'вошедший с протухшим токеном',
      { user: { id: 'u1' }, error: 'RefreshAccessTokenError' },
      'authenticated',
      'local',
    ],
  ];

  it.each(cases)('%s → %s', (_name, data, status, expected) => {
    sessionState.data = data;
    sessionState.status = status;

    const Probe = () => <span>{useProgressTarget()}</span>;
    render(<Probe />);

    expect(screen.getByText(expected)).toBeInTheDocument();
  });
});

describe('ReaderClient: куда уходит прогресс', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mutate.mockClear();
    clearLocalProgress();
    syncState.isSettled = true;
    readerBootstrapResult.data = twoChapters;
    readerBootstrapResult.isLoading = false;
    readerBootstrapResult.error = null;
  });

  afterEach(() => {
    vi.useRealTimers();
    clearLocalProgress();
  });

  const openNextChapter = () => {
    fireEvent.click(screen.getByLabelText('Следующая глава'));
    act(() => {
      vi.advanceTimersByTime(4000);
    });
  };

  it('аноним не дергает закрытую ручку, а пишет локально', () => {
    sessionState.data = null;
    sessionState.status = 'unauthenticated';

    render(<ReaderClient params={{ lang: 'ru', slug: 'hamlet' }} />);
    openNextChapter();

    expect(mutate).not.toHaveBeenCalled();
    expect(readLocalProgress('v1')?.text).toMatchObject({ chapterNumber: 2, position: 0 });
  });

  it('вошедшему прогресс сохраняется на сервере и не оседает локально', () => {
    sessionState.data = { user: { id: 'u1' } };
    sessionState.status = 'authenticated';

    render(<ReaderClient params={{ lang: 'ru', slug: 'hamlet' }} />);
    openNextChapter();

    expect(mutate).toHaveBeenCalledTimes(1);
    expect(mutate).toHaveBeenCalledWith({ chapterNumber: 2, position: 0 });
    expect(readLocalProgress('v1')).toBeNull();
  });

  /**
   * 🔴 Самый дорогой из исходов. Сессия ещё грузится — значит про читателя
   * неизвестно ничего. Запись в этот момент уходит «за вошедшего» в локальное
   * хранилище, а слияние при входе принимает её за самую свежую и откатывает
   * человека назад по книге.
   */
  it('пока сессия грузится, прогресс не пишется никуда', () => {
    sessionState.data = undefined;
    sessionState.status = 'loading';

    render(<ReaderClient params={{ lang: 'ru', slug: 'hamlet' }} />);
    openNextChapter();

    expect(mutate).not.toHaveBeenCalled();
    expect(readLocalProgress('v1')).toBeNull();
  });

  /**
   * 🔴 Открытие книги не должно её же и обнулять. Отложенное сохранение
   * стартует сразу при монтировании: сними условие «сначала восстановились»
   * — и первая глава через три секунды ляжет поверх сохранённой двенадцатой.
   */
  it('аноним возвращается на сохранённую главу и не затирает её', () => {
    sessionState.data = null;
    sessionState.status = 'unauthenticated';

    render(<ReaderClient params={{ lang: 'ru', slug: 'hamlet' }} />);
    openNextChapter();
    expect(readLocalProgress('v1')?.text).toMatchObject({ chapterNumber: 2 });

    cleanup();
    render(<ReaderClient params={{ lang: 'ru', slug: 'hamlet' }} />);
    act(() => {
      vi.advanceTimersByTime(4000);
    });

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Вторая');
    expect(readLocalProgress('v1')?.text).toMatchObject({ chapterNumber: 2 });
  });

  /**
   * 🔴 Локальная запись у вошедшего — запасной источник, а не мусор.
   * Слияние могло не пройти — тогда на сервере пусто, а место в книге цело
   * только здесь. Откроешь такую книгу с первой главы — через три секунды
   * закрепишь её на сервере и потеряешь локальную при следующем слиянии.
   */
  it('вошедший без серверного прогресса берёт локальную запись', () => {
    sessionState.data = null;
    sessionState.status = 'unauthenticated';
    render(<ReaderClient params={{ lang: 'ru', slug: 'hamlet' }} />);
    openNextChapter();
    cleanup();

    sessionState.data = { user: { id: 'u1' } };
    sessionState.status = 'authenticated';
    readerBootstrapResult.data = { ...twoChapters, lastProgress: null };

    render(<ReaderClient params={{ lang: 'ru', slug: 'hamlet' }} />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Вторая');
  });

  /**
   * 🔴 Человек успел выбрать главу сам, пока шло слияние — уводить его
   * с этой страницы нельзя, но сохранение открыть обязательно.
   */
  it('ручной выбор главы отменяет восстановление, но не сохранение', () => {
    sessionState.data = null;
    sessionState.status = 'unauthenticated';
    render(<ReaderClient params={{ lang: 'ru', slug: 'hamlet' }} />);
    openNextChapter();
    cleanup();

    settleLater();
    render(<ReaderClient params={{ lang: 'ru', slug: 'hamlet' }} />);
    fireEvent.click(screen.getByLabelText('Следующая глава'));
    releaseSettle();
    act(() => {
      vi.advanceTimersByTime(4000);
    });

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Вторая');
    expect(readLocalProgress('v1')?.text).toMatchObject({ chapterNumber: 2 });
  });

  /**
   * 🔴 Общий компьютер. Читатель A с протухшим токеном накопил запись;
   * слияние её честно пропускает, а восстановление без той же проверки уронит B на
   * главу A — и через три секунды запишет её в аккаунт B.
   */
  it('чужая локальная запись не восстанавливается и не уезжает на сервер', () => {
    saveLocalProgress({
      versionId: 'v1',
      ownerId: 'someone-else',
      kind: 'text',
      chapterNumber: 2,
      position: 0,
    });

    sessionState.data = { user: { id: 'u1' } };
    sessionState.status = 'authenticated';
    readerBootstrapResult.data = { ...twoChapters, lastProgress: null };

    render(<ReaderClient params={{ lang: 'ru', slug: 'hamlet' }} />);
    act(() => {
      vi.advanceTimersByTime(4000);
    });

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Первая');
    // Глава чужого читателя на сервер не уехала: записалась та, что читают сейчас.
    expect(mutate).toHaveBeenCalledWith({ chapterNumber: 1, position: 0 });
    expect(mutate).not.toHaveBeenCalledWith({ chapterNumber: 2, position: 0 });
  });

  /**
   * 🔴 Обратная запись того, что только что прочитано. Слияние упало на сети,
   * читалка восстановила серверную 5-ю главу — и тут же шлёт её обратно. Серверный
   * `updatedAt` становится свежее локального, и следующее слияние удаляет
   * несведённую 12-ю как устаревшую. Место читателя не просто не показано — стёрто.
   */
  it('восстановленная глава не записывается обратно', () => {
    sessionState.data = { user: { id: 'u1' } };
    sessionState.status = 'authenticated';
    readerBootstrapResult.data = {
      ...twoChapters,
      lastProgress: { chapterNumber: 2, position: 0 },
    };

    render(<ReaderClient params={{ lang: 'ru', slug: 'hamlet' }} />);
    act(() => {
      vi.advanceTimersByTime(4000);
    });

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Вторая');
    expect(mutate).not.toHaveBeenCalled();
  });

  it('а следующая глава после восстановления — записывается', () => {
    sessionState.data = { user: { id: 'u1' } };
    sessionState.status = 'authenticated';
    readerBootstrapResult.data = {
      ...twoChapters,
      lastProgress: { chapterNumber: 1, position: 0 },
    };

    render(<ReaderClient params={{ lang: 'ru', slug: 'hamlet' }} />);
    openNextChapter();

    expect(mutate).toHaveBeenCalledWith({ chapterNumber: 2, position: 0 });
  });

  it('вошедший восстанавливается по серверному значению, а не по локальному', () => {
    sessionState.data = null;
    sessionState.status = 'unauthenticated';
    render(<ReaderClient params={{ lang: 'ru', slug: 'hamlet' }} />);
    openNextChapter();
    cleanup();

    sessionState.data = { user: { id: 'u1' } };
    sessionState.status = 'authenticated';
    readerBootstrapResult.data = {
      ...twoChapters,
      lastProgress: { chapterNumber: 1, position: 0 },
    };

    render(<ReaderClient params={{ lang: 'ru', slug: 'hamlet' }} />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Первая');
  });
});
