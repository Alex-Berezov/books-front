import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ReaderClient from '@/app/[lang]/book/[slug]/read/ReaderClient';
import { useCanSaveProgress } from '@/lib/auth/useCanSaveProgress';

/**
 * Чтение открыто анониму, а `PUT /me/progress/:versionId` требует токена.
 *
 * 🔴 Посадка на оба направления сразу. Уберут проверку — аноним снова начнёт
 * бить в закрытую ручку на каждой смене главы: 401 из `getAccessToken`,
 * а при малейшей перестановке кода в `httpPutAuth` тот же 401 уходит в
 * `handleAuthFailure` и выбрасывает читателя на форму входа. Проверят вместо
 * сессии что-нибудь другое — вошедший молча перестанет накапливать прогресс,
 * и не заметит этого никто, потому что ошибки при этом нет.
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

const twoChapters = {
  versionId: 'v1',
  slug: 'hamlet',
  title: 'Hamlet',
  chapters: [
    { id: 'c1', number: 1, title: 'Первая', content: '<p>1</p>' },
    { id: 'c2', number: 2, title: 'Вторая', content: '<p>2</p>' },
  ],
};

describe('useCanSaveProgress', () => {
  const cases: Array<[string, unknown, string, boolean]> = [
    ['аноним', null, 'unauthenticated', false],
    ['сессия ещё грузится', undefined, 'loading', false],
    ['вошедший', { user: { id: 'u1' } }, 'authenticated', true],
    // Токен протух и обновиться не смог: `session.user` на месте, но запрос
    // получит 401 и уведёт пользователя на форму входа принудительным выходом.
    [
      'вошедший с протухшим токеном',
      { user: { id: 'u1' }, error: 'RefreshAccessTokenError' },
      'authenticated',
      false,
    ],
  ];

  it.each(cases)('%s → %s', (_name, data, status, expected) => {
    sessionState.data = data;
    sessionState.status = status;

    const Probe = () => <span>{String(useCanSaveProgress())}</span>;
    render(<Probe />);

    expect(screen.getByText(String(expected))).toBeInTheDocument();
  });
});

describe('ReaderClient: прогресс пишется только вошедшему', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mutate.mockClear();
    readerBootstrapResult.data = twoChapters;
    readerBootstrapResult.isLoading = false;
    readerBootstrapResult.error = null;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const openNextChapter = () => {
    fireEvent.click(screen.getByLabelText('Следующая глава'));
    act(() => {
      vi.advanceTimersByTime(4000);
    });
  };

  it('аноним не дергает закрытую ручку прогресса', () => {
    sessionState.data = null;
    sessionState.status = 'unauthenticated';

    render(<ReaderClient params={{ lang: 'ru', slug: 'hamlet' }} />);
    openNextChapter();

    expect(mutate).not.toHaveBeenCalled();
  });

  it('вошедшему прогресс сохраняется', () => {
    sessionState.data = { user: { id: 'u1' } };
    sessionState.status = 'authenticated';

    render(<ReaderClient params={{ lang: 'ru', slug: 'hamlet' }} />);
    openNextChapter();

    expect(mutate).toHaveBeenCalledTimes(1);
    expect(mutate).toHaveBeenCalledWith({ chapterNumber: 2, position: 0 });
  });
});
