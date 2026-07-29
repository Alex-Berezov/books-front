import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RightsNotificationsBell } from '@/components/admin/AdminShell/AdminTopBar/RightsNotificationsBell/RightsNotificationsBell';
import type { RightsNotification } from '@/types/api-schema/rights-agent';

const mockUseUnreadCount = vi.fn();
const mockUseNotifications = vi.fn();
const mockMarkRead = vi.fn();
const mockMarkAllRead = vi.fn();
const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useParams: () => ({ lang: 'en' }),
  useRouter: () => ({ push: mockPush }),
}));

vi.mock('@/api/hooks/useRightsAgent', () => ({
  useRightsNotificationsUnreadCount: () => mockUseUnreadCount(),
  useRightsNotifications: () => mockUseNotifications(),
  useMarkRightsNotificationRead: () => ({ mutateAsync: mockMarkRead, isPending: false }),
  useMarkAllRightsNotificationsRead: () => ({ mutate: mockMarkAllRead, isPending: false }),
}));

const makeNotification = (overrides: Partial<RightsNotification> = {}): RightsNotification => ({
  id: 'notification-1',
  type: 'AGENT_REPORT_RECEIVED',
  severity: 'SUCCESS',
  titleRu: 'Получен отчёт агента',
  messageRu: 'Внешний агент прислал отчёт по интейку «Гамлет». Предупреждений: 0.',
  rightsIntakeId: 'intake-1',
  agentSubmissionId: 'submission-1',
  rightsReviewImportId: 'import-1',
  rightsProfileId: null,
  bookVersionId: null,
  payload: null,
  isRead: false,
  readAt: null,
  createdAt: new Date().toISOString(),
  ...overrides,
});

const mockState = (unreadCount: number, items: RightsNotification[] = []) => {
  mockUseUnreadCount.mockReturnValue({ data: { unreadCount }, isLoading: false });
  mockUseNotifications.mockReturnValue({
    data: { items, total: items.length, page: 1, limit: 10 },
    isLoading: false,
  });
};

describe('RightsNotificationsBell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMarkRead.mockResolvedValue(makeNotification({ isRead: true }));
  });

  it('shows the unread badge, and hides it at zero', () => {
    mockState(4);
    const { rerender } = render(<RightsNotificationsBell />);
    expect(screen.getByText('4')).toBeInTheDocument();

    mockState(0);
    rerender(<RightsNotificationsBell />);
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('caps the badge at 99+', () => {
    mockState(250);
    render(<RightsNotificationsBell />);

    expect(screen.getByText('99+')).toBeInTheDocument();
  });

  it('opens the list and marks an item read on click', async () => {
    mockState(1, [makeNotification()]);
    render(<RightsNotificationsBell />);

    await userEvent.click(screen.getByRole('button', { name: 'Rights notifications' }));
    expect(screen.getByText('Получен отчёт агента')).toBeInTheDocument();

    await userEvent.click(screen.getByText('Получен отчёт агента'));
    expect(mockMarkRead).toHaveBeenCalledWith('notification-1');
    expect(mockPush).toHaveBeenCalledWith('/admin/en/rights-intakes/intake-1');
  });

  it('marks everything read from the dropdown header', async () => {
    mockState(3, [makeNotification()]);
    render(<RightsNotificationsBell />);

    await userEvent.click(screen.getByRole('button', { name: 'Rights notifications' }));
    await userEvent.click(screen.getByRole('button', { name: /Отметить все прочитанными/i }));

    expect(mockMarkAllRead).toHaveBeenCalled();
  });
});
