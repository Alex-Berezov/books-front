import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useSession } from 'next-auth/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import * as useAuthHooks from '@/api/hooks/useAuth';
import ProfilePage from '@/app/[lang]/profile/page';
import { toast } from '@/lib/utils/toast';
import { ApiError } from '@/types/api';

/**
 * Ответ `GET /users/me/activities` — обёртка `{items,total,page,limit,hasNext}`,
 * а не голый массив (`LEGACY-218`). Хелпер собирает страницу мока, чтобы
 * каждый вызов `useUserActivities` в тестах не повторял форму руками.
 */
const activitiesPage = (items: unknown[] = [], hasNext = false, page = 1) => ({
  items,
  total: items.length,
  page,
  limit: 10,
  hasNext,
});

/**
 * `useUserActivities` — `useInfiniteQuery`, поэтому компонент читает
 * `data.pages`, а не одну страницу. Хелпер собирает результат хука из списка
 * страниц; `overrides` задают состояние загрузки, отказа и наличия следующей.
 */
const activitiesQuery = (
  pages: ReturnType<typeof activitiesPage>[],
  overrides: Record<string, unknown> = {}
) =>
  ({
    data: { pages, pageParams: pages.map((p) => p.page) },
    isLoading: false,
    isFetchingNextPage: false,
    hasNextPage: pages.length > 0 ? pages[pages.length - 1].hasNext : false,
    fetchNextPage: vi.fn(),
    isError: false,
    refetch: vi.fn(),
    ...overrides,
  }) as unknown as ReturnType<typeof useAuthHooks.useUserActivities>;

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    refresh: vi.fn(),
  })),
  useParams: vi.fn(() => ({
    lang: 'en',
  })),
  usePathname: vi.fn(() => '/en/profile'),
}));

// Mock next-auth/react
vi.mock('next-auth/react', () => ({
  useSession: vi.fn(),
}));

// Mock toast utility
vi.mock('@/lib/utils/toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock hooks
vi.mock('@/api/hooks/useAuth', () => ({
  useMe: vi.fn(),
  useUpdateProfile: vi.fn(),
  useUserActivities: vi.fn(),
  useUploadAvatar: vi.fn(),
}));

// Mock useTranslation
vi.mock('@/lib/i18n/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'profile.cabinet': 'Personal Profile',
        'profile.email': 'Email address',
        'profile.name': 'Full Name',
        'profile.nickname': 'Unique Nickname',
        'profile.nicknameHint': 'Only letters, numbers and underscores are allowed',
        'profile.save': 'Save Changes',
        'profile.saving': 'Saving...',
        'profile.uploading': 'Uploading...',
        'profile.uploadError': 'Failed to upload avatar',
        'profile.avatarUploaded': 'Avatar uploaded',
        'profile.updateSuccess': 'Profile updated successfully!',
        'profile.updateError': 'Failed to update profile',
        'profile.nicknameTaken': 'This nickname is already taken',
        'profile.checkFields': 'Check the name and nickname and try again',
        'profile.myActivities': 'My Activities',
        'profile.activitiesDesc': 'History of your reviews and comments on books',
        'profile.repliedTo': 'Replied to',
        'profile.replies': 'Replies',
        'profile.hiddenByModerator':
          'Hidden by a moderator: this comment and its replies are not visible to other readers.',
        'profile.noActivities': 'You have not left any reviews or comments yet.',
        'profile.exploreCatalog': 'Explore Catalog',
        'profile.invalidNickname': 'Nickname must contain only letters, numbers and underscores.',
        'profile.unauthTitle': 'Personal Profile',
        'profile.unauthText':
          'Sign in to manage your profile, customize your unique nickname, and view your reviews.',
        'profile.signIn': 'Sign In',
        'profile.loadMore': 'Show More',
        'common.retry': 'Try again',
        'common.serverError': 'Server error. Please try again later.',
      };
      return translations[key] || key;
    },
    lang: 'en',
    dict: {},
  }),
}));

// Mock matchMedia (required for Ant Design/Skeletons)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

describe('ProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading skeleton when loading session or user data', () => {
    vi.mocked(useSession).mockReturnValue({
      data: null,
      status: 'loading',
    } as unknown as ReturnType<typeof useSession>);
    vi.mocked(useAuthHooks.useMe).mockReturnValue({
      data: null,
      isLoading: true,
    } as unknown as ReturnType<typeof useAuthHooks.useMe>);
    vi.mocked(useAuthHooks.useUserActivities).mockReturnValue(
      activitiesQuery([activitiesPage()], { isLoading: true })
    );

    const { container } = render(<ProfilePage />);
    // Verify that the skeleton is rendered
    expect(container.querySelector('.ant-skeleton')).toBeInTheDocument();
  });

  it('renders redirect screen for unauthenticated users', () => {
    vi.mocked(useSession).mockReturnValue({
      data: null,
      status: 'unauthenticated',
    } as unknown as ReturnType<typeof useSession>);
    vi.mocked(useAuthHooks.useMe).mockReturnValue({
      data: null,
      isLoading: false,
    } as unknown as ReturnType<typeof useAuthHooks.useMe>);
    vi.mocked(useAuthHooks.useUserActivities).mockReturnValue(activitiesQuery([activitiesPage()]));

    render(<ProfilePage />);
    expect(screen.getByText(/Personal Profile/i)).toBeInTheDocument();
    expect(screen.getByText(/Sign in to manage your profile/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign In/i })).toBeInTheDocument();
  });

  it('renders form and activities for authenticated users', () => {
    vi.mocked(useSession).mockReturnValue({
      data: { user: { email: 'john@example.com' } },
      status: 'authenticated',
    } as unknown as ReturnType<typeof useSession>);

    const mockUser = {
      email: 'john@example.com',
      displayName: 'John Doe',
      nickname: 'john_doe',
      avatarUrl: 'https://avatar.png',
      roles: ['USER'],
    };

    const mockActivities = [
      {
        id: 'act-1',
        text: 'This is my review of the book',
        createdAt: '2026-06-12T00:00:00.000Z',
        bookVersion: {
          id: 'v-1',
          slug: 'test-book',
          title: 'Test Book',
          author: 'Test Author',
          coverImageUrl: 'https://cover.png',
        },
        replies: [],
      },
    ];

    vi.mocked(useAuthHooks.useMe).mockReturnValue({
      data: mockUser,
      isLoading: false,
    } as unknown as ReturnType<typeof useAuthHooks.useMe>);
    vi.mocked(useAuthHooks.useUserActivities).mockReturnValue(
      activitiesQuery([activitiesPage(mockActivities)])
    );
    vi.mocked(useAuthHooks.useUpdateProfile).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useAuthHooks.useUpdateProfile>);
    vi.mocked(useAuthHooks.useUploadAvatar).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useAuthHooks.useUploadAvatar>);

    render(<ProfilePage />);

    // Check cabinet heading
    expect(screen.getByRole('heading', { name: /Personal Profile/i })).toBeInTheDocument();

    // Check fields
    expect(screen.getByLabelText(/Email address/i)).toHaveValue('john@example.com');
    expect(screen.getByLabelText(/Full Name/i)).toHaveValue('John Doe');
    expect(screen.getByLabelText(/Unique Nickname/i)).toHaveValue('john_doe');

    // Check activity list
    expect(screen.getByText(/My Activities/i)).toBeInTheDocument();
    expect(screen.getByText('Test Book')).toBeInTheDocument();
    expect(screen.getByText('This is my review of the book')).toBeInTheDocument();
  });

  // Посадка LEGACY-218 на стороне фронта: страница режется бэкендом, а «Load more»
  // обязан ДОПОЛНЯТЬ список, а не подменять его — иначе первая страница пропадает
  // из виду в момент клика.
  it('«Load more» подгружает вторую страницу активности и не теряет первую (LEGACY-218)', async () => {
    vi.mocked(useSession).mockReturnValue({
      data: { user: { email: 'john@example.com' } },
      status: 'authenticated',
    } as unknown as ReturnType<typeof useSession>);
    vi.mocked(useAuthHooks.useMe).mockReturnValue({
      data: {
        email: 'john@example.com',
        displayName: 'John Doe',
        nickname: 'john_doe',
        avatarUrl: '',
        roles: ['USER'],
      },
      isLoading: false,
    } as unknown as ReturnType<typeof useAuthHooks.useMe>);
    vi.mocked(useAuthHooks.useUpdateProfile).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useAuthHooks.useUpdateProfile>);
    vi.mocked(useAuthHooks.useUploadAvatar).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useAuthHooks.useUploadAvatar>);

    const pageOneItem = {
      id: 'act-1',
      text: 'First page activity',
      createdAt: '2026-06-12T00:00:00.000Z',
      bookVersion: null,
      replies: [],
    };
    const pageTwoItem = {
      id: 'act-2',
      text: 'Second page activity',
      createdAt: '2026-06-11T00:00:00.000Z',
      bookVersion: null,
      replies: [],
    };
    // Накопление ведёт сам `useInfiniteQuery`: клик зовёт `fetchNextPage`,
    // после чего в `data.pages` лежат обе страницы. Мок повторяет это —
    // сначала одна страница, после клика две, — а не подменяет одну другой.
    const fetchNextPage = vi.fn();
    const onePage = activitiesQuery([activitiesPage([pageOneItem], true)], { fetchNextPage });
    const twoPages = activitiesQuery(
      [activitiesPage([pageOneItem], true), activitiesPage([pageTwoItem], false, 2)],
      { fetchNextPage }
    );
    vi.mocked(useAuthHooks.useUserActivities).mockReturnValue(onePage);

    const { rerender } = render(<ProfilePage />);

    expect(screen.getByText('First page activity')).toBeInTheDocument();
    expect(screen.queryByText('Second page activity')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Show More/i }));
    // Кнопка обязана звать дозагрузку, а не крутить счётчик страницы сама:
    // накопление и разбор `hasNext` живут в хуке.
    expect(fetchNextPage).toHaveBeenCalledTimes(1);

    vi.mocked(useAuthHooks.useUserActivities).mockReturnValue(twoPages);
    rerender(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByText('Second page activity')).toBeInTheDocument();
    });
    // Первая страница остаётся видна — «Load more» дополняет список.
    expect(screen.getByText('First page activity')).toBeInTheDocument();
  });

  // Отказ дозагрузки не выдаётся за конец списка: уже показанное остаётся,
  // а кнопка переключается на повтор. Без этого кейса ветка `isError`
  // недостижима ни одним тестом, а читатель видит «активности больше нет».
  it('отказ дозагрузки показывает повтор, а не конец списка (LEGACY-218)', () => {
    vi.mocked(useSession).mockReturnValue({
      data: { user: { email: 'john@example.com' } },
      status: 'authenticated',
    } as unknown as ReturnType<typeof useSession>);
    vi.mocked(useAuthHooks.useMe).mockReturnValue({
      data: {
        email: 'john@example.com',
        displayName: 'John Doe',
        nickname: 'john_doe',
        avatarUrl: '',
        roles: ['USER'],
      },
      isLoading: false,
    } as unknown as ReturnType<typeof useAuthHooks.useMe>);
    vi.mocked(useAuthHooks.useUpdateProfile).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useAuthHooks.useUpdateProfile>);
    vi.mocked(useAuthHooks.useUploadAvatar).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useAuthHooks.useUploadAvatar>);

    const loadedItem = {
      id: 'act-1',
      text: 'First page activity',
      createdAt: '2026-06-12T00:00:00.000Z',
      bookVersion: null,
      replies: [],
    };
    const refetch = vi.fn();
    vi.mocked(useAuthHooks.useUserActivities).mockReturnValue(
      activitiesQuery([activitiesPage([loadedItem], true)], { isError: true, refetch })
    );

    render(<ProfilePage />);

    // Уже загруженное с экрана не исчезает.
    expect(screen.getByText('First page activity')).toBeInTheDocument();
    const retry = screen.getByRole('button', { name: /Try again/i });
    fireEvent.click(retry);
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  // Вторая половина того же поведения: пока страница летит, кнопка заблокирована.
  // Без этого кейса снятие `disabled` не покраснило бы ни один тест, и повторные
  // клики множили бы запросы за одну подгрузку.
  it('кнопка подгрузки заблокирована, пока идёт запрос (LEGACY-218)', () => {
    vi.mocked(useSession).mockReturnValue({
      data: { user: { email: 'john@example.com' } },
      status: 'authenticated',
    } as unknown as ReturnType<typeof useSession>);
    vi.mocked(useAuthHooks.useMe).mockReturnValue({
      data: {
        email: 'john@example.com',
        displayName: 'John Doe',
        nickname: 'john_doe',
        avatarUrl: '',
        roles: ['USER'],
      },
      isLoading: false,
    } as unknown as ReturnType<typeof useAuthHooks.useMe>);
    vi.mocked(useAuthHooks.useUpdateProfile).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useAuthHooks.useUpdateProfile>);
    vi.mocked(useAuthHooks.useUploadAvatar).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useAuthHooks.useUploadAvatar>);
    vi.mocked(useAuthHooks.useUserActivities).mockReturnValue(
      activitiesQuery(
        [
          activitiesPage(
            [
              {
                id: 'act-1',
                text: 'Fetching page activity',
                createdAt: '2026-06-12T00:00:00.000Z',
                bookVersion: null,
                replies: [],
              },
            ],
            true
          ),
        ],
        { isFetchingNextPage: true }
      )
    );

    render(<ProfilePage />);

    // Список уже показан — спиннер на всю секцию при дозагрузке не поднимается.
    expect(screen.getByText('Fetching page activity')).toBeInTheDocument();
    const loadMore = screen.getByRole('button', { name: /Show More|Loading/i });
    expect(loadMore).toBeDisabled();
  });

  // Посадка LEGACY-212 на стороне фронта. Метка обязательна: без неё запись
  // с обнулёнными сервером `replies` выглядит как обычная, и автор не узнаёт,
  // что его комментарий скрыт модератором, — то есть модерация становится
  // неотличима от пропажи данных.
  it('помечает собственную запись, скрытую модератором (LEGACY-212)', () => {
    vi.mocked(useSession).mockReturnValue({
      data: { user: { email: 'john@example.com' } },
      status: 'authenticated',
    } as unknown as ReturnType<typeof useSession>);

    const mockActivities = [
      {
        id: 'act-hidden',
        text: 'My hidden comment',
        isHidden: true,
        createdAt: '2026-06-12T00:00:00.000Z',
        parentId: null,
        parent: null,
        bookVersion: null,
        replies: [],
      },
      {
        id: 'act-visible',
        text: 'My visible comment',
        isHidden: false,
        createdAt: '2026-06-12T00:00:00.000Z',
        parentId: null,
        parent: null,
        bookVersion: null,
        replies: [],
      },
    ];

    vi.mocked(useAuthHooks.useMe).mockReturnValue({
      data: {
        email: 'john@example.com',
        displayName: 'John Doe',
        nickname: 'john_doe',
        avatarUrl: '',
        roles: ['USER'],
      },
      isLoading: false,
    } as unknown as ReturnType<typeof useAuthHooks.useMe>);
    vi.mocked(useAuthHooks.useUserActivities).mockReturnValue(
      activitiesQuery([activitiesPage(mockActivities)])
    );
    vi.mocked(useAuthHooks.useUpdateProfile).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useAuthHooks.useUpdateProfile>);
    vi.mocked(useAuthHooks.useUploadAvatar).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useAuthHooks.useUploadAvatar>);

    render(<ProfilePage />);

    // Оба текста на месте: скрытая запись со страницы автора не исчезает.
    expect(screen.getByText('My hidden comment')).toBeInTheDocument();
    expect(screen.getByText('My visible comment')).toBeInTheDocument();

    // 🔴 Ровно одна метка на две записи: метка на каждой означала бы, что
    // компонент не читает флаг вовсе.
    expect(screen.getAllByText(/Hidden by a moderator/i)).toHaveLength(1);
  });

  it('triggers validation error on invalid nickname characters', async () => {
    vi.mocked(useSession).mockReturnValue({
      data: { user: { email: 'john@example.com' } },
      status: 'authenticated',
    } as unknown as ReturnType<typeof useSession>);

    const mockUser = {
      email: 'john@example.com',
      displayName: 'John Doe',
      nickname: 'john_doe',
      avatarUrl: '',
      roles: ['USER'],
    };

    vi.mocked(useAuthHooks.useMe).mockReturnValue({
      data: mockUser,
      isLoading: false,
    } as unknown as ReturnType<typeof useAuthHooks.useMe>);
    vi.mocked(useAuthHooks.useUserActivities).mockReturnValue(activitiesQuery([activitiesPage()]));

    const mutateAsyncMock = vi.fn();
    vi.mocked(useAuthHooks.useUpdateProfile).mockReturnValue({
      mutateAsync: mutateAsyncMock,
      isPending: false,
    } as unknown as ReturnType<typeof useAuthHooks.useUpdateProfile>);

    render(<ProfilePage />);

    const nicknameInput = screen.getByLabelText(/Unique Nickname/i);
    // Invalid characters: spaces or special chars other than underscore
    fireEvent.change(nicknameInput, { target: { value: 'john-doe!' } });

    const saveButton = screen.getByRole('button', { name: /Save Changes/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        'Nickname must contain only letters, numbers and underscores.'
      );
      expect(mutateAsyncMock).not.toHaveBeenCalled();
    });
  });

  it('submits profile edits correctly', async () => {
    vi.mocked(useSession).mockReturnValue({
      data: { user: { email: 'john@example.com' } },
      status: 'authenticated',
    } as unknown as ReturnType<typeof useSession>);

    const mockUser = {
      email: 'john@example.com',
      displayName: 'John Doe',
      nickname: 'john_doe',
      avatarUrl: '',
      roles: ['USER'],
    };

    vi.mocked(useAuthHooks.useMe).mockReturnValue({
      data: mockUser,
      isLoading: false,
    } as unknown as ReturnType<typeof useAuthHooks.useMe>);
    vi.mocked(useAuthHooks.useUserActivities).mockReturnValue(activitiesQuery([activitiesPage()]));

    const mutateAsyncMock = vi.fn().mockResolvedValue({});
    vi.mocked(useAuthHooks.useUpdateProfile).mockReturnValue({
      mutateAsync: mutateAsyncMock,
      isPending: false,
    } as unknown as ReturnType<typeof useAuthHooks.useUpdateProfile>);

    render(<ProfilePage />);

    const nameInput = screen.getByLabelText(/Full Name/i);
    fireEvent.change(nameInput, { target: { value: 'John Updated' } });

    const nicknameInput = screen.getByLabelText(/Unique Nickname/i);
    fireEvent.change(nicknameInput, { target: { value: 'john_new' } });

    const saveButton = screen.getByRole('button', { name: /Save Changes/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mutateAsyncMock).toHaveBeenCalledWith({
        name: 'John Updated',
        nickname: 'john_new',
        avatarUrl: undefined,
      });
      expect(toast.success).toHaveBeenCalledWith('Profile updated successfully!');
    });
  });

  /**
   * 🔴 `LEGACY-053`: страница печатала посетителю `err.message` — английский текст
   * бэкенда или запасную фразу транспорта. Сторож краснеет на возврате: в тосте
   * не должно быть ни одной строки из ошибки, только текст словаря.
   */
  describe('отказ сохранения', () => {
    const renderWithFailure = async (error: unknown) => {
      vi.mocked(useSession).mockReturnValue({
        data: { user: { email: 'john@example.com' } },
        status: 'authenticated',
      } as unknown as ReturnType<typeof useSession>);
      vi.mocked(useAuthHooks.useMe).mockReturnValue({
        data: { email: 'john@example.com', displayName: 'John', nickname: 'john', roles: ['USER'] },
        isLoading: false,
      } as unknown as ReturnType<typeof useAuthHooks.useMe>);
      vi.mocked(useAuthHooks.useUserActivities).mockReturnValue(
        activitiesQuery([activitiesPage()])
      );
      vi.mocked(useAuthHooks.useUpdateProfile).mockReturnValue({
        mutateAsync: vi.fn().mockRejectedValue(error),
        isPending: false,
      } as unknown as ReturnType<typeof useAuthHooks.useUpdateProfile>);

      render(<ProfilePage />);
      fireEvent.change(screen.getByLabelText(/Unique Nickname/i), {
        target: { value: 'taken_nick' },
      });
      fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));
    };

    it('занятый никнейм показывается своим текстом, а не английским сообщением сервера', async () => {
      await renderWithFailure(
        new ApiError({
          message: 'Nickname is already in use',
          statusCode: 409,
          error: 'Conflict',
        })
      );

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('This nickname is already taken');
      });
      expect(toast.error).not.toHaveBeenCalledWith('Nickname is already in use');
    });

    it('валидационный отказ называет, что проверить', async () => {
      // Правила длины у сторон расходятся: форма проверяет только шаблон никнейма,
      // бэкенд требует трёх знаков. Общий текст не оставлял подсказки вовсе.
      await renderWithFailure(
        new ApiError({
          message: 'nickname must be longer than or equal to 3 characters',
          statusCode: 400,
        })
      );

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Check the name and nickname and try again');
      });
    });

    it('неизвестный отказ сводится к общему тексту словаря', async () => {
      await renderWithFailure(new ApiError({ message: 'Teapot', statusCode: 418 }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to update profile');
      });
    });
  });
});
