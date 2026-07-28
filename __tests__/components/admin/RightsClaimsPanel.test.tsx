import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RightsClaimsPanel } from '@/components/admin/books/RightsClaimsPanel/RightsClaimsPanel';
import type { RightsClaimSummary } from '@/types/api-schema/rights-claims';

const mockUseVersionRightsClaims = vi.fn();

vi.mock('@/api/hooks/useRightsClaims', () => ({
  useVersionRightsClaims: (versionId: string) => mockUseVersionRightsClaims(versionId),
  useRightsClaim: () => ({ data: undefined, isLoading: false }),
  useApplyClaimBlock: () => ({ mutate: vi.fn(), isPending: false }),
  useLiftClaimBlock: () => ({ mutate: vi.fn(), isPending: false }),
  useCreateRightsClaim: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateRightsClaim: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useRecordClaimResponse: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useRecordCounterNotice: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useResolveRightsClaim: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useAddClaimAttachment: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

const makeClaim = (overrides: Partial<RightsClaimSummary> = {}): RightsClaimSummary => ({
  id: 'claim-1',
  claimNumber: 'CLM-2026-000001',
  claimType: 'DMCA_TAKEDOWN',
  status: 'UNDER_REVIEW',
  severity: 'HIGH',
  channel: 'EMAIL',
  receivedAt: '2026-07-20T00:00:00.000Z',
  deadlineAt: '2026-08-03T00:00:00.000Z',
  resolvedAt: null,
  closedAt: null,
  claimantName: 'Acme Publishing',
  claimantType: 'PUBLISHER',
  claimantOrganization: 'Acme Group',
  claimantEmail: 'legal@acme.example',
  claimantIsAuthorized: true,
  bookId: 'book-1',
  bookVersionId: 'version-1',
  rightsProfileId: null,
  rightsIntakeId: null,
  affectedCountryCodes: ['DE', 'FR'],
  affectedLanguages: ['en'],
  claimedWorkTitle: 'The Claimed Work',
  claimedWorkAuthor: 'Some Author',
  descriptionRu: 'Нарушение авторских прав на текст',
  assignedToUserId: null,
  blocksPublication: true,
  requiresLawyerReview: false,
  resolution: null,
  isOpen: true,
  isOverdue: false,
  daysUntilDeadline: 6,
  activeBlocksCount: 0,
  hasWorldwideBlock: false,
  blockedCountryCodes: [],
  createdAt: '2026-07-20T00:00:00.000Z',
  updatedAt: '2026-07-20T00:00:00.000Z',
  ...overrides,
});

const mockClaims = (items: RightsClaimSummary[]) => {
  mockUseVersionRightsClaims.mockReturnValue({
    data: { items, total: items.length, page: 1, limit: items.length },
    isLoading: false,
  });
};

describe('RightsClaimsPanel', () => {
  it('renders the claim count, rows and metrics', () => {
    mockClaims([makeClaim({ activeBlocksCount: 2, blockedCountryCodes: ['DE', 'FR'] })]);

    render(<RightsClaimsPanel bookId="book-1" versionId="version-1" />);

    expect(screen.getByText('Претензии и DMCA (1)')).toBeInTheDocument();
    expect(screen.getByTestId('claim-row-claim-1')).toBeInTheDocument();
    expect(screen.getByText('CLM-2026-000001')).toBeInTheDocument();
    expect(screen.getByText('Acme Publishing')).toBeInTheDocument();
    expect(screen.getByText('Всего: 1')).toBeInTheDocument();
    expect(screen.getByText('Открытых: 1')).toBeInTheDocument();
    expect(screen.getByText('Блокирующих публикацию: 1')).toBeInTheDocument();
    expect(screen.getByText('Активных блокировок: 2')).toBeInTheDocument();
    expect(screen.getByText('Заблокировано стран: 2')).toBeInTheDocument();
  });

  it('shows the empty state when no claim is registered', () => {
    mockClaims([]);

    render(<RightsClaimsPanel bookId="book-1" versionId="version-1" />);

    expect(screen.getByText('Претензии и DMCA (0)')).toBeInTheDocument();
    expect(screen.getByText('Активных претензий нет')).toBeInTheDocument();
    expect(
      screen.getByText('По этой версии не зарегистрировано ни одной претензии правообладателей.')
    ).toBeInTheDocument();
  });

  it('shows the blocking banner when a claim blocks publication', () => {
    mockClaims([makeClaim()]);

    render(<RightsClaimsPanel bookId="book-1" versionId="version-1" />);

    expect(
      screen.getByText('Публикация заблокирована претензией правообладателя')
    ).toBeInTheDocument();
  });

  it('shows only a warning banner for an open non-blocking claim', () => {
    mockClaims([makeClaim({ blocksPublication: false })]);

    render(<RightsClaimsPanel bookId="book-1" versionId="version-1" />);

    expect(screen.getByText('Есть открытые претензии')).toBeInTheDocument();
  });

  it('highlights an overdue deadline', () => {
    mockClaims([makeClaim({ isOverdue: true, daysUntilDeadline: -4 })]);

    render(<RightsClaimsPanel bookId="book-1" versionId="version-1" />);

    expect(screen.getByTestId('claim-overdue-claim-1')).toBeInTheDocument();
    expect(screen.getByText('Просроченных: 1')).toBeInTheDocument();
  });

  it('hides mutation controls in readOnly mode', () => {
    mockClaims([makeClaim()]);

    render(<RightsClaimsPanel bookId="book-1" readOnly versionId="version-1" />);

    expect(screen.queryByText('Зарегистрировать претензию')).not.toBeInTheDocument();
    expect(screen.queryByText('Заблокировать доступ')).not.toBeInTheDocument();
    expect(screen.queryByText('Открыть')).not.toBeInTheDocument();
  });
});
