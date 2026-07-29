import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ReviewChainPanel } from '@/components/admin/RightsIntakeDetail/ReviewChainPanel/ReviewChainPanel';
import type { RightsReviewChainItem } from '@/types/api-schema/rights-recheck';

const mockUseReviewChain = vi.fn();

vi.mock('@/api/hooks/useRightsRecheck', () => ({
  useReviewChain: () => mockUseReviewChain(),
}));

const makeItem = (overrides: Partial<RightsReviewChainItem> = {}): RightsReviewChainItem => ({
  id: 'review-1',
  revisionNumber: 1,
  previousReviewId: null,
  chainRootReviewId: 'review-1',
  status: 'HUMAN_APPROVED',
  overallStatus: 'PUBLIC_DOMAIN',
  publicationGate: 'ALLOW',
  confidence: 'HIGH',
  nextReviewAt: '2027-01-01T00:00:00.000Z',
  approvedAt: '2026-05-01T00:00:00.000Z',
  approvedByUserId: 'u1',
  approvedByUserName: 'Редактор',
  rightsProfileId: 'profile-1',
  rightsReviewImportId: 'import-1',
  isCurrent: false,
  createdAt: '2026-05-01T00:00:00.000Z',
  diffFromPrevious: null,
  ...overrides,
});

describe('ReviewChainPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('says the clearance has not been rechecked yet when there is a single review', () => {
    mockUseReviewChain.mockReturnValue({ data: { items: [makeItem()], total: 1 } });

    render(<ReviewChainPanel intakeId="intake-1" />);

    expect(screen.getByText(/Проверка ещё не перепроверялась/)).toBeInTheDocument();
    expect(screen.getByText('#1')).toBeInTheDocument();
  });

  it('renders three revisions in order with diff rows between them', () => {
    mockUseReviewChain.mockReturnValue({
      data: {
        items: [
          makeItem({ id: 'r1', revisionNumber: 1, publicationGate: 'ALLOW' }),
          makeItem({
            id: 'r2',
            revisionNumber: 2,
            previousReviewId: 'r1',
            publicationGate: 'BLOCK',
            rightsProfileId: 'profile-2',
            diffFromPrevious: {
              overallStatusChanged: false,
              publicationGateChanged: true,
              confidenceChanged: false,
              changedCountryCount: 3,
            },
          }),
          makeItem({
            id: 'r3',
            revisionNumber: 3,
            previousReviewId: 'r2',
            publicationGate: 'ALLOW',
            rightsProfileId: 'profile-3',
            isCurrent: true,
            diffFromPrevious: {
              overallStatusChanged: false,
              publicationGateChanged: true,
              confidenceChanged: false,
              changedCountryCount: 0,
            },
          }),
        ],
        total: 3,
      },
    });

    render(<ReviewChainPanel intakeId="intake-1" />);

    expect(screen.getByText('#1')).toBeInTheDocument();
    expect(screen.getByText('#2')).toBeInTheDocument();
    expect(screen.getByText('#3')).toBeInTheDocument();
    expect(screen.getByText('Publication gate: ALLOW → BLOCK')).toBeInTheDocument();
    expect(screen.getByText('Publication gate: BLOCK → ALLOW')).toBeInTheDocument();
    expect(screen.getByText('Изменено стран: 3')).toBeInTheDocument();
    expect(screen.queryByText(/Проверка ещё не перепроверялась/)).not.toBeInTheDocument();
  });

  it('renders an empty state when the intake has no reviews', () => {
    mockUseReviewChain.mockReturnValue({ data: { items: [], total: 0 } });

    render(<ReviewChainPanel intakeId="intake-1" />);

    expect(screen.getByText('Проверок по этому интейку пока нет.')).toBeInTheDocument();
  });
});
