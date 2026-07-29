import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RecheckPanel } from '@/components/admin/RightsIntakeDetail/RecheckPanel/RecheckPanel';
import type {
  RightsRecheckScheduleWithTasks,
  RightsRecheckTask,
} from '@/types/api-schema/rights-recheck';

const mockUseIntakeRecheckTasks = vi.fn();
const mockUseRecheckSchedule = vi.fn();
const mockComplete = vi.fn();
const mockDismiss = vi.fn();
const mockUpdateSchedule = vi.fn();

vi.mock('@/api/hooks/useRightsRecheck', () => ({
  useIntakeRecheckTasks: () => mockUseIntakeRecheckTasks(),
  useRecheckSchedule: () => mockUseRecheckSchedule(),
  useStartRightsRecheckTask: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useCompleteRightsRecheckTask: () => ({ mutateAsync: mockComplete, isPending: false }),
  useDismissRightsRecheckTask: () => ({ mutateAsync: mockDismiss, isPending: false }),
  useSnoozeRightsRecheckTask: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useReopenRightsRecheckTask: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useCreateRightsRecheckTask: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateRecheckSchedule: () => ({ mutateAsync: mockUpdateSchedule, isPending: false }),
}));

const makeTask = (overrides: Partial<RightsRecheckTask> = {}): RightsRecheckTask => ({
  id: 'task-1',
  reason: 'SCHEDULED_DUE',
  reasonRu: 'плановый срок перепроверки',
  status: 'PENDING',
  severity: 'INFO',
  source: 'SCHEDULER',
  rightsProfileId: 'profile-1',
  rightsIntakeId: 'intake-1',
  baselineReviewId: null,
  bookId: null,
  bookVersionId: null,
  legalChangeEventId: null,
  titleRu: 'Плановая перепроверка прав',
  descriptionRu: 'Проверьте, не изменились ли основания clearance.',
  triggerCode: null,
  affectedCountryCodes: [],
  dueAt: '2026-06-01T00:00:00.000Z',
  reminderStage: 'NONE',
  remindersSentCount: 0,
  lastReminderAt: null,
  snoozedUntil: null,
  snoozeReasonRu: null,
  startedAt: null,
  startedByUserId: null,
  completedAt: null,
  completedByUserId: null,
  completionNotesRu: null,
  completedReviewId: null,
  dismissedAt: null,
  dismissedByUserId: null,
  dismissReasonRu: null,
  resolution: null,
  resolutionRu: null,
  createdByUserId: null,
  createdAt: '2026-05-01T00:00:00.000Z',
  updatedAt: '2026-05-01T00:00:00.000Z',
  isOpen: true,
  isOverdue: false,
  daysUntilDue: 12,
  isSnoozed: false,
  effectiveSeverity: 'INFO',
  ...overrides,
});

const makeSchedule = (
  overrides: Partial<RightsRecheckScheduleWithTasks> = {}
): RightsRecheckScheduleWithTasks => ({
  rightsProfileId: 'profile-1',
  recheckPolicy: 'INHERIT_REPORT',
  recheckIntervalDays: null,
  nextReviewAt: '2027-01-01T00:00:00.000Z',
  recheckPausedUntil: null,
  recheckPauseReasonRu: null,
  lastRecheckScanAt: '2026-07-30T06:00:00.000Z',
  computedDueAt: '2027-01-01T00:00:00.000Z',
  openTasksCount: 0,
  openTasks: [],
  ...overrides,
});

describe('RecheckPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseIntakeRecheckTasks.mockReturnValue({
      data: { items: [], total: 0, page: 1, limit: 20 },
    });
    mockUseRecheckSchedule.mockReturnValue({ data: makeSchedule() });
  });

  it('renders the empty state when there is no open task', () => {
    render(<RecheckPanel intakeId="intake-1" profileId="profile-1" workflowStatus="APPROVED" />);

    expect(screen.getByText('Открытых задач перепроверки нет.')).toBeInTheDocument();
  });

  it('renders an overdue task with a BLOCKING badge and a negative day count', () => {
    mockUseIntakeRecheckTasks.mockReturnValue({
      data: {
        items: [makeTask({ isOverdue: true, daysUntilDue: -45, effectiveSeverity: 'BLOCKING' })],
        total: 1,
        page: 1,
        limit: 20,
      },
    });

    render(<RecheckPanel intakeId="intake-1" profileId="profile-1" workflowStatus="APPROVED" />);

    expect(screen.getByText('BLOCKING')).toBeInTheDocument();
    expect(screen.getByText('просрочено на 45 дн.')).toBeInTheDocument();
  });

  it('opens the complete modal and sends the typed note', async () => {
    const user = userEvent.setup();
    mockUseIntakeRecheckTasks.mockReturnValue({
      data: { items: [makeTask()], total: 1, page: 1, limit: 20 },
    });

    render(<RecheckPanel intakeId="intake-1" profileId="profile-1" workflowStatus="APPROVED" />);

    await user.click(screen.getByRole('button', { name: 'Complete' }));
    await user.type(screen.getByLabelText('Заметка'), 'Проверено');
    await user.click(screen.getByRole('button', { name: 'Закрыть задачу' }));

    await waitFor(() => {
      expect(mockComplete).toHaveBeenCalledWith({
        taskId: 'task-1',
        data: { notesRu: 'Проверено', resolution: 'MANUALLY_CLOSED' },
      });
    });
  });

  it('does not fire the dismiss mutation without a reason', async () => {
    const user = userEvent.setup();
    mockUseIntakeRecheckTasks.mockReturnValue({
      data: { items: [makeTask()], total: 1, page: 1, limit: 20 },
    });

    render(<RecheckPanel intakeId="intake-1" profileId="profile-1" workflowStatus="APPROVED" />);

    await user.click(screen.getByRole('button', { name: 'Dismiss' }));
    await user.click(screen.getByRole('button', { name: 'Отклонить' }));

    expect(mockDismiss).not.toHaveBeenCalled();
    expect(screen.getByText('Укажите причину отклонения (минимум 3 символа).')).toBeInTheDocument();
  });

  it('shows the schedule and saves an edited policy', async () => {
    const user = userEvent.setup();

    render(<RecheckPanel intakeId="intake-1" profileId="profile-1" workflowStatus="APPROVED" />);

    expect(screen.getByText('INHERIT_REPORT')).toBeInTheDocument();
    expect(
      screen.getAllByText(new Date('2027-01-01T00:00:00.000Z').toLocaleDateString()).length
    ).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: 'Edit schedule' }));
    await user.click(screen.getByRole('button', { name: 'Сохранить' }));

    await waitFor(() => {
      expect(mockUpdateSchedule).toHaveBeenCalled();
    });
  });
});
