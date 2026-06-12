import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useSession } from 'next-auth/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import * as useAuthHooks from '@/api/hooks/useAuth';
import ProfilePage from '@/app/[lang]/profile/page';
import { toast } from '@/lib/utils/toast';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    refresh: vi.fn(),
  })),
  useParams: vi.fn(() => ({
    lang: 'en',
  })),
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
        'profile.myActivities': 'My Activities',
        'profile.activitiesDesc': 'History of your reviews and comments on books',
        'profile.repliedTo': 'Replied to',
        'profile.replies': 'Replies',
        'profile.noActivities': 'You have not left any reviews or comments yet.',
        'profile.exploreCatalog': 'Explore Catalog',
        'profile.invalidNickname': 'Nickname must contain only letters, numbers and underscores.',
        'profile.unauthTitle': 'Personal Profile',
        'profile.unauthText':
          'Sign in to manage your profile, customize your unique nickname, and view your reviews.',
        'profile.signIn': 'Sign In',
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
    vi.mocked(useAuthHooks.useUserActivities).mockReturnValue({
      data: [],
      isLoading: true,
    } as unknown as ReturnType<typeof useAuthHooks.useUserActivities>);

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
    vi.mocked(useAuthHooks.useUserActivities).mockReturnValue({
      data: [],
      isLoading: false,
    } as unknown as ReturnType<typeof useAuthHooks.useUserActivities>);

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
    vi.mocked(useAuthHooks.useUserActivities).mockReturnValue({
      data: mockActivities,
      isLoading: false,
    } as unknown as ReturnType<typeof useAuthHooks.useUserActivities>);
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
    vi.mocked(useAuthHooks.useUserActivities).mockReturnValue({
      data: [],
      isLoading: false,
    } as unknown as ReturnType<typeof useAuthHooks.useUserActivities>);

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
    vi.mocked(useAuthHooks.useUserActivities).mockReturnValue({
      data: [],
      isLoading: false,
    } as unknown as ReturnType<typeof useAuthHooks.useUserActivities>);

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
});
