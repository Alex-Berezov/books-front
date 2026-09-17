import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RightsClaimsPanel } from '@/components/admin/books/RightsClaimsPanel/RightsClaimsPanel';
import { API_MAX_PAGE_SIZE } from '@/lib/http.constants';
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

const mockClaims = (items: RightsClaimSummary[], total = items.length) => {
  mockUseVersionRightsClaims.mockReturnValue({
    data: {
      items,
      pagination: {
        page: 1,
        limit: API_MAX_PAGE_SIZE,
        total,
        totalPages: total > 0 ? Math.ceil(total / API_MAX_PAGE_SIZE) : 0,
      },
    },
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

  it('says the list is incomplete when the server holds more claims than one page (LEGACY-377)', () => {
    mockClaims([makeClaim(), makeClaim({ id: 'claim-2', claimNumber: 'CLM-2026-000002' })], 130);

    render(<RightsClaimsPanel bookId="book-1" versionId="version-1" />);

    expect(screen.getByTestId('claims-truncated')).toHaveTextContent(
      'Показаны первые 2 из 130 претензий'
    );
    expect(screen.getByText('Претензии и DMCA (130)')).toBeInTheDocument();
    expect(screen.getByText('Всего: 130')).toBeInTheDocument();
    expect(screen.getByTestId('claims-truncated')).not.toHaveTextContent('разделе претензий');
  });

  it('does not claim "no active claims" when the page is closed claims only and the list is cut', () => {
    mockClaims([makeClaim({ isOpen: false, blocksPublication: false })], 130);

    render(<RightsClaimsPanel bookId="book-1" versionId="version-1" />);

    expect(screen.queryByText('Активных претензий нет')).not.toBeInTheDocument();
    expect(
      screen.getByText('Список неполный: блокирующие претензии могли не попасть на страницу')
    ).toBeInTheDocument();
  });

  it('does not settle for "open claims" when the list is cut: a blocking claim may be past the page', () => {
    mockClaims([makeClaim({ blocksPublication: false })], 130);

    render(<RightsClaimsPanel bookId="book-1" versionId="version-1" />);

    expect(screen.queryByText('Есть открытые претензии')).not.toBeInTheDocument();
    expect(
      screen.getByText('Список неполный: блокирующие претензии могли не попасть на страницу')
    ).toBeInTheDocument();
    expect(screen.getByText('Блокирующих публикацию (среди показанных): 0')).toBeInTheDocument();
  });

  it('still reports a blocking claim it can see on a cut list', () => {
    mockClaims([makeClaim()], 130);

    render(<RightsClaimsPanel bookId="book-1" versionId="version-1" />);

    expect(
      screen.getByText('Публикация заблокирована претензией правообладателя')
    ).toBeInTheDocument();
  });

  it('does not read a failed request as "no claims"', () => {
    mockUseVersionRightsClaims.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    });

    render(<RightsClaimsPanel bookId="book-1" versionId="version-1" />);

    expect(screen.queryByText('Активных претензий нет')).not.toBeInTheDocument();
    expect(
      screen.queryByText('По этой версии не зарегистрировано ни одной претензии правообладателей.')
    ).not.toBeInTheDocument();
    expect(
      screen.getByText('Не удалось загрузить претензии: статус неизвестен')
    ).toBeInTheDocument();
    expect(screen.getByText('Претензии и DMCA (—)')).toBeInTheDocument();
    expect(screen.getByText('Блокирующих публикацию: —')).toBeInTheDocument();
  });

  it('keeps the loaded claims when a background refresh fails', () => {
    mockUseVersionRightsClaims.mockReturnValue({
      data: {
        items: [makeClaim({ blocksPublication: false })],
        pagination: { page: 1, limit: API_MAX_PAGE_SIZE, total: 1, totalPages: 1 },
      },
      isLoading: false,
      isError: true,
    });

    render(<RightsClaimsPanel bookId="book-1" versionId="version-1" />);

    expect(screen.getByTestId('claim-row-claim-1')).toBeInTheDocument();
    expect(screen.getByText('Заблокировать доступ')).toBeInTheDocument();
    expect(screen.getByTestId('claims-refresh-failed')).toBeInTheDocument();
    expect(screen.getByText('Есть открытые претензии')).toBeInTheDocument();
  });

  it('does not read a pending request as "no claims"', () => {
    mockUseVersionRightsClaims.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    });

    render(<RightsClaimsPanel bookId="book-1" versionId="version-1" />);

    expect(screen.queryByText('Активных претензий нет')).not.toBeInTheDocument();
    expect(screen.getByText('Всего: —')).toBeInTheDocument();
    expect(screen.getByText('Открытых: —')).toBeInTheDocument();
  });

  it('stays silent about completeness when the whole list fits', () => {
    mockClaims([makeClaim()]);

    render(<RightsClaimsPanel bookId="book-1" versionId="version-1" />);

    expect(screen.queryByTestId('claims-truncated')).not.toBeInTheDocument();
  });

  it('hides mutation controls in readOnly mode', () => {
    mockClaims([makeClaim()]);

    render(<RightsClaimsPanel bookId="book-1" readOnly versionId="version-1" />);

    expect(screen.queryByText('Зарегистрировать претензию')).not.toBeInTheDocument();
    expect(screen.queryByText('Заблокировать доступ')).not.toBeInTheDocument();
    expect(screen.queryByText('Открыть')).not.toBeInTheDocument();
  });
});
