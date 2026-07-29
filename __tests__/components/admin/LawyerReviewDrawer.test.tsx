import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LawyerReviewDrawer } from '@/components/admin/rights-lawyer/LawyerReviewDrawer/LawyerReviewDrawer';
import type { RightsLawyerReviewDetail } from '@/types/api-schema/rights-lawyer';

const mockUseLawyerReview = vi.fn();
const mockDecide = vi.fn();
const mockAssign = vi.fn();

vi.mock('@/api/hooks/useRightsLawyer', () => ({
  useLawyerReview: () => mockUseLawyerReview(),
  useLawyers: () => ({
    data: {
      items: [
        {
          id: 'lawyer-1',
          fullName: 'Иванова Анна',
          lawyerType: 'EXTERNAL_COUNSEL',
          organization: null,
          barId: null,
          email: null,
          phone: null,
          jurisdictionCodes: [],
          specializationRu: null,
          notesRu: null,
          userId: null,
          userEmail: null,
          hasLawyerRole: false,
          isActive: true,
          deactivatedAt: null,
          deactivateReasonRu: null,
          createdAt: '2026-07-01T00:00:00.000Z',
          updatedAt: '2026-07-01T00:00:00.000Z',
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
    },
  }),
  useAssignLawyerReview: () => ({ mutateAsync: mockAssign, isPending: false }),
  useStartLawyerReview: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDecideLawyerReview: () => ({ mutateAsync: mockDecide, isPending: false }),
  useWithdrawLawyerReview: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useReopenLawyerReview: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useAddLawyerReviewNote: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useAttachLegalOpinion: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useSatisfyLawyerCondition: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useWaiveLawyerCondition: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

const makeDetail = (
  overrides: Partial<RightsLawyerReviewDetail> = {}
): RightsLawyerReviewDetail => ({
  id: 'lr-1',
  reviewNumber: 'LR-2026-000001',
  status: 'IN_PROGRESS',
  effectiveStatus: 'IN_PROGRESS',
  trigger: 'HIGH_RISK_POLICY',
  riskLevel: 'HIGH',
  rightsProfileId: 'profile-1',
  rightsIntakeId: 'intake-1',
  rightsReviewId: 'review-1',
  bookId: null,
  bookVersionId: null,
  rightsClaimId: null,
  titleRu: 'Юридическая проверка Гамлета',
  questionRu: 'Можно ли публиковать перевод?',
  contextRu: null,
  affectedCountryCodes: [],
  affectedLanguages: [],
  affectedComponentIds: [],
  blocksApproval: true,
  requestedByUserId: 'user-1',
  requestedAt: '2026-07-01T00:00:00.000Z',
  dueAt: '2026-07-15T00:00:00.000Z',
  assignedLawyerId: 'lawyer-1',
  assignedLawyerName: 'Иванова Анна',
  assignedAt: '2026-07-02T00:00:00.000Z',
  startedAt: '2026-07-03T00:00:00.000Z',
  decision: null,
  decidedAt: null,
  decidedByUserId: null,
  decidedLawyerId: null,
  lawyerNameSnapshot: null,
  opinionSummaryRu: null,
  restrictionsRu: null,
  approvedCountryCodes: [],
  blockedCountryCodes: [],
  validUntil: null,
  expiredAt: null,
  withdrawnAt: null,
  withdrawReasonRu: null,
  reopenedAt: null,
  isOverdue: false,
  daysUntilDue: 5,
  daysUntilExpiry: null,
  isExpiringSoon: false,
  blocksPublication: true,
  pendingConditionsCount: 0,
  blockingConditionsCount: 0,
  satisfiedConditionsCount: 0,
  opinionsCount: 0,
  activeOpinionsCount: 0,
  intakeTitle: 'Гамлет',
  bookSlug: null,
  versionLanguage: null,
  createdAt: '2026-07-01T00:00:00.000Z',
  updatedAt: '2026-07-03T00:00:00.000Z',
  conditions: [],
  opinions: [],
  events: [
    {
      id: 'ev-1',
      eventType: 'REQUESTED',
      fromStatus: null,
      toStatus: 'PENDING',
      messageRu: 'Открыта юридическая проверка LR-2026-000001.',
      payload: null,
      createdByUserId: 'user-1',
      createdAt: '2026-07-01T00:00:00.000Z',
    },
    {
      id: 'ev-2',
      eventType: 'STARTED',
      fromStatus: 'PENDING',
      toStatus: 'IN_PROGRESS',
      messageRu: 'Юрист взял проверку в работу.',
      payload: null,
      createdByUserId: 'user-2',
      createdAt: '2026-07-03T00:00:00.000Z',
    },
  ],
  riskFactors: [
    {
      code: 'CONFIDENCE_LOW',
      level: 'HIGH',
      messageRu: 'Уверенность проверки прав — LOW.',
      details: null,
    },
  ],
  ...overrides,
});

const renderDrawer = () =>
  render(<LawyerReviewDrawer reviewId="lr-1" onClose={vi.fn()} isStaff isAdmin canDecide />);

describe('LawyerReviewDrawer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseLawyerReview.mockReturnValue({
      data: makeDetail(),
      isLoading: false,
      isError: false,
    });
  });

  it('renders nothing when no review is selected', () => {
    const { container } = render(
      <LawyerReviewDrawer reviewId={null} onClose={vi.fn()} isStaff isAdmin canDecide />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('renders the timeline in ascending order', () => {
    renderDrawer();

    const events = screen.getAllByText(/Проверка запрошена|Взято в работу/);
    expect(events[0]).toHaveTextContent('Проверка запрошена');
    expect(events[1]).toHaveTextContent('Взято в работу');
  });

  it('keeps the decision button disabled until a lawyer and a summary are given', async () => {
    const user = userEvent.setup();
    renderDrawer();

    await user.click(screen.getByRole('button', { name: 'Вынести решение' }));

    const submit = screen.getByRole('button', { name: 'Сохранить решение' });
    expect(submit).toBeDisabled();

    await user.type(
      screen.getByLabelText('Заключение (минимум 10 символов)'),
      'Публикация допустима.'
    );
    expect(submit).toBeEnabled();
  });

  it('requires at least one condition for APPROVED_WITH_CONDITIONS', async () => {
    const user = userEvent.setup();
    renderDrawer();

    await user.click(screen.getByRole('button', { name: 'Вынести решение' }));
    await user.type(
      screen.getByLabelText('Заключение (минимум 10 символов)'),
      'Публикация допустима при условии.'
    );
    await user.selectOptions(screen.getByLabelText('Решение'), 'APPROVED_WITH_CONDITIONS');

    const submit = screen.getByRole('button', { name: 'Сохранить решение' });
    expect(submit).toBeDisabled();

    await user.type(screen.getByLabelText('Код условия'), 'attribution_text');
    await user.type(screen.getByLabelText('Текст условия'), 'Указать источник');
    await user.click(screen.getByRole('button', { name: 'Добавить условие' }));

    expect(submit).toBeEnabled();
    await user.click(submit);

    expect(mockDecide).toHaveBeenCalledWith({
      id: 'lr-1',
      data: expect.objectContaining({
        decision: 'APPROVED_WITH_CONDITIONS',
        lawyerId: 'lawyer-1',
        conditions: [{ code: 'ATTRIBUTION_TEXT', textRu: 'Указать источник', isBlocking: true }],
      }),
    });
  });

  it('shows the lawyer name snapshot next to the current directory name', () => {
    mockUseLawyerReview.mockReturnValue({
      data: makeDetail({
        status: 'APPROVED',
        effectiveStatus: 'APPROVED',
        decision: 'APPROVED',
        lawyerNameSnapshot: 'Иванова Анна (на момент решения)',
        assignedLawyerName: 'Петрова Анна',
      }),
      isLoading: false,
      isError: false,
    });

    renderDrawer();

    expect(screen.getByText('Иванова Анна (на момент решения)')).toBeInTheDocument();
    expect(screen.getByText('Петрова Анна')).toBeInTheDocument();
  });

  it('hides the decision actions from a user who may not decide', () => {
    render(
      <LawyerReviewDrawer
        reviewId="lr-1"
        onClose={vi.fn()}
        isStaff
        isAdmin={false}
        canDecide={false}
      />
    );

    expect(screen.queryByRole('button', { name: 'Вынести решение' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Отозвать' })).toBeInTheDocument();
  });
});
