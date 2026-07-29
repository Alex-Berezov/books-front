import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LawyerReviewPanel } from '@/components/admin/RightsIntakeDetail/LawyerReviewPanel/LawyerReviewPanel';
import type { RightsLawyerReview, RiskAssessmentSnapshot } from '@/types/api-schema/rights-lawyer';

const mockUseProfileRiskAssessment = vi.fn();
const mockUseIntakeLawyerReviews = vi.fn();
const mockRequire = vi.fn();
const mockSession = vi.fn();

vi.mock('next-auth/react', () => ({
  useSession: () => mockSession(),
}));

vi.mock('@/api/hooks/useRightsLawyer', () => ({
  useProfileRiskAssessment: () => mockUseProfileRiskAssessment(),
  useIntakeLawyerReviews: () => mockUseIntakeLawyerReviews(),
  useLawyers: () => ({ data: { items: [], total: 0, page: 1, limit: 20 } }),
  useRequireLawyerReviewForProfile: () => ({ mutateAsync: mockRequire, isPending: false }),
  useLawyerReview: () => ({ data: null, isLoading: false, isError: false }),
  useAssignLawyerReview: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useStartLawyerReview: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDecideLawyerReview: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useWithdrawLawyerReview: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useReopenLawyerReview: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useAddLawyerReviewNote: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useAttachLegalOpinion: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useSatisfyLawyerCondition: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useWaiveLawyerCondition: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

const makeAssessment = (
  overrides: Partial<RiskAssessmentSnapshot> = {}
): RiskAssessmentSnapshot => ({
  rightsProfileId: 'profile-1',
  riskLevel: 'HIGH',
  factors: [
    {
      code: 'CONFIDENCE_LOW',
      level: 'HIGH',
      messageRu: 'Уверенность проверки прав — LOW.',
      details: null,
    },
  ],
  lawyerReviewRequired: true,
  blockApprovalEnabled: true,
  minRiskLevel: 'HIGH',
  assessedAt: '2026-07-31T10:00:00.000Z',
  currentLawyerReview: null,
  explicitLawyerRequest: false,
  suggestedTrigger: 'HIGH_RISK_POLICY',
  lawyerApproved: false,
  lawyerApprovedAt: null,
  lawyerApprovedLawyerName: null,
  lawyerOpinionValidUntil: null,
  ...overrides,
});

const makeReview = (overrides: Partial<RightsLawyerReview> = {}): RightsLawyerReview => ({
  id: 'lr-1',
  reviewNumber: 'LR-2026-000001',
  status: 'APPROVED',
  effectiveStatus: 'APPROVED',
  trigger: 'HIGH_RISK_POLICY',
  riskLevel: 'HIGH',
  rightsProfileId: 'profile-1',
  rightsIntakeId: 'intake-1',
  rightsReviewId: 'review-1',
  bookId: null,
  bookVersionId: null,
  rightsClaimId: null,
  titleRu: 'Юридическая проверка',
  questionRu: 'Можно ли публиковать?',
  contextRu: null,
  affectedCountryCodes: [],
  affectedLanguages: [],
  affectedComponentIds: [],
  blocksApproval: true,
  requestedByUserId: 'user-1',
  requestedAt: '2026-07-01T00:00:00.000Z',
  dueAt: '2026-07-15T00:00:00.000Z',
  assignedLawyerId: 'lawyer-1',
  assignedLawyerName: 'Петрова Анна',
  assignedAt: '2026-07-02T00:00:00.000Z',
  startedAt: '2026-07-03T00:00:00.000Z',
  decision: 'APPROVED',
  decidedAt: '2026-07-05T00:00:00.000Z',
  decidedByUserId: 'user-1',
  decidedLawyerId: 'lawyer-1',
  lawyerNameSnapshot: 'Иванова Анна',
  opinionSummaryRu: 'Публикация допустима.',
  restrictionsRu: null,
  approvedCountryCodes: [],
  blockedCountryCodes: [],
  validUntil: '2028-07-05T00:00:00.000Z',
  expiredAt: null,
  withdrawnAt: null,
  withdrawReasonRu: null,
  reopenedAt: null,
  isOverdue: false,
  daysUntilDue: 5,
  daysUntilExpiry: 700,
  isExpiringSoon: false,
  blocksPublication: false,
  pendingConditionsCount: 0,
  blockingConditionsCount: 0,
  satisfiedConditionsCount: 0,
  opinionsCount: 1,
  activeOpinionsCount: 1,
  intakeTitle: 'Гамлет',
  bookSlug: null,
  versionLanguage: null,
  createdAt: '2026-07-01T00:00:00.000Z',
  updatedAt: '2026-07-05T00:00:00.000Z',
  ...overrides,
});

describe('LawyerReviewPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession.mockReturnValue({ data: { user: { roles: ['admin'] } } });
    mockUseProfileRiskAssessment.mockReturnValue({ data: makeAssessment(), refetch: vi.fn() });
    mockUseIntakeLawyerReviews.mockReturnValue({
      data: { items: [], total: 0, page: 1, limit: 20 },
    });
  });

  it('renders the risk level and its factors', () => {
    render(<LawyerReviewPanel intakeId="intake-1" profileId="profile-1" />);

    expect(screen.getByText('Высокий риск')).toBeInTheDocument();
    expect(screen.getByText('Уверенность проверки прав — LOW.')).toBeInTheDocument();
    expect(screen.getByText('CONFIDENCE_LOW')).toBeInTheDocument();
  });

  it('warns that the approval is blocked while no lawyer opinion is in force', () => {
    render(<LawyerReviewPanel intakeId="intake-1" profileId="profile-1" />);

    expect(screen.getByText(/утверждение этого профиля заблокировано/i)).toBeInTheDocument();
  });

  it('shows the approval banner instead once the lawyer has approved', () => {
    mockUseProfileRiskAssessment.mockReturnValue({
      data: makeAssessment({
        lawyerApproved: true,
        lawyerApprovedLawyerName: 'Иванова Анна',
        lawyerOpinionValidUntil: '2028-07-05T00:00:00.000Z',
      }),
      refetch: vi.fn(),
    });

    render(<LawyerReviewPanel intakeId="intake-1" profileId="profile-1" />);

    expect(screen.getByText(/Юрист согласовал права/)).toBeInTheDocument();
    expect(screen.queryByText(/утверждение этого профиля заблокировано/i)).not.toBeInTheDocument();
  });

  it('prefers the lawyer name snapshot over the current directory name', () => {
    mockUseIntakeLawyerReviews.mockReturnValue({
      data: { items: [makeReview()], total: 1, page: 1, limit: 20 },
    });

    render(<LawyerReviewPanel intakeId="intake-1" profileId="profile-1" />);

    expect(screen.getAllByText('Иванова Анна').length).toBeGreaterThan(0);
    expect(screen.queryByText('Петрова Анна')).not.toBeInTheDocument();
  });

  it('hides the request button from a lawyer, who is not staff', () => {
    mockSession.mockReturnValue({ data: { user: { roles: ['lawyer'] } } });

    render(<LawyerReviewPanel intakeId="intake-1" profileId="profile-1" />);

    expect(
      screen.queryByRole('button', { name: 'Запросить юридическую проверку' })
    ).not.toBeInTheDocument();
  });

  it('sends the request with the typed question', async () => {
    const user = userEvent.setup();
    render(<LawyerReviewPanel intakeId="intake-1" profileId="profile-1" />);

    await user.click(screen.getByRole('button', { name: 'Запросить юридическую проверку' }));
    await user.type(screen.getByLabelText(/Вопрос юристу/), 'Можно ли публиковать этот перевод?');
    await user.click(screen.getByRole('button', { name: 'Запросить' }));

    expect(mockRequire).toHaveBeenCalledWith({
      profileId: 'profile-1',
      data: expect.objectContaining({ questionRu: 'Можно ли публиковать этот перевод?' }),
    });
  });

  it('explains that the assessment needs a materialised profile', () => {
    render(<LawyerReviewPanel intakeId="intake-1" profileId={null} />);

    expect(
      screen.getByText('Оценка риска появится после материализации профиля прав.')
    ).toBeInTheDocument();
  });
});
