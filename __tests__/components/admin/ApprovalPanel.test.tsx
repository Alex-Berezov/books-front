import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApprovalPanel } from '@/components/admin/RightsIntakeDetail/ApprovalPanel/ApprovalPanel';
import type { RightsProfileDetail } from '@/types/api-schema/rights-intake';
import type { RiskAssessmentSnapshot } from '@/types/api-schema/rights-lawyer';

vi.mock('@/api/hooks/useRightsIntakes', () => ({
  useApproveRightsReview: () => ({ mutate: vi.fn(), isPending: false }),
  useRejectRightsReview: () => ({ mutate: vi.fn(), isPending: false }),
  rightsIntakeKeys: { all: ['rights-intakes'] },
}));

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
);

const makeProfile = (): RightsProfileDetail =>
  ({
    id: 'profile-1',
    publicationGate: 'ALLOW',
    actions: [],
  }) as unknown as RightsProfileDetail;

const makeAssessment = (
  overrides: Partial<RiskAssessmentSnapshot> = {}
): RiskAssessmentSnapshot => ({
  rightsProfileId: 'profile-1',
  riskLevel: 'HIGH',
  factors: [],
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

const renderPanel = (props: Partial<Parameters<typeof ApprovalPanel>[0]> = {}) =>
  render(
    <ApprovalPanel
      intakeId="intake-1"
      reviewId="review-1"
      reviewStatus="HUMAN_REVIEW_REQUIRED"
      currentProfile={makeProfile()}
      onApproved={vi.fn()}
      onRejected={vi.fn()}
      {...props}
    />,
    { wrapper }
  );

describe('ApprovalPanel — Phase 19 lawyer gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('disables Approve and shows an alert while a lawyer opinion is missing', () => {
    renderPanel({ riskAssessment: makeAssessment() });

    expect(screen.getByText('Approval blocked')).toBeInTheDocument();
    expect(
      screen.getByText('Утверждение заблокировано: требуется заключение юриста')
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Approve Review/i })).toBeDisabled();
  });

  it('enables Approve once the lawyer has approved', () => {
    renderPanel({
      riskAssessment: makeAssessment({
        lawyerApproved: true,
        lawyerApprovedLawyerName: 'Иванова Анна',
      }),
    });

    expect(screen.queryByText('Approval blocked')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Approve Review/i })).toBeEnabled();
  });

  it('leaves Approve enabled when no assessment is supplied at all', () => {
    renderPanel();

    expect(screen.getByRole('button', { name: /Approve Review/i })).toBeEnabled();
  });

  it('renders for a LAWYER_APPROVED review and shows the lawyer banner', () => {
    renderPanel({
      reviewStatus: 'LAWYER_APPROVED',
      riskAssessment: makeAssessment({
        lawyerApproved: true,
        lawyerApprovedLawyerName: 'Иванова Анна',
      }),
    });

    expect(screen.getByText('Юрист одобрил')).toBeInTheDocument();
    expect(screen.getByText('Положительное заключение вынес Иванова Анна.')).toBeInTheDocument();
  });

  it('renders nothing for a review that is still with the lawyer', () => {
    const { container } = renderPanel({
      reviewStatus: 'LAWYER_REVIEW_REQUIRED',
      riskAssessment: makeAssessment(),
    });

    expect(container).toBeEmptyDOMElement();
  });
});
