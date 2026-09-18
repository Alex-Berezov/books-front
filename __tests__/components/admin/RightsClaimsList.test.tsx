import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RightsClaimsList } from '@/components/admin/rights-claims/RightsClaimsList/RightsClaimsList';
import type { RightsClaimSummary } from '@/types/api-schema/rights-claims';

const mockUseRightsClaims = vi.fn();

vi.mock('@/api/hooks/useRightsClaims', () => ({
  useRightsClaims: (params: Record<string, unknown>) => mockUseRightsClaims(params),
}));

const makeClaim = (overrides: Partial<RightsClaimSummary> = {}): RightsClaimSummary => ({
  id: 'claim-1',
  claimNumber: 'CLM-2026-000001',
  claimType: 'DMCA_TAKEDOWN',
  status: 'RECEIVED',
  severity: 'CRITICAL',
  channel: 'EMAIL',
  receivedAt: '2026-07-20T00:00:00.000Z',
  deadlineAt: '2026-08-03T00:00:00.000Z',
  resolvedAt: null,
  closedAt: null,
  claimantName: 'Acme Publishing',
  claimantType: 'PUBLISHER',
  claimantOrganization: null,
  claimantEmail: null,
  claimantIsAuthorized: true,
  bookId: 'book-1',
  bookVersionId: 'version-1',
  rightsProfileId: null,
  rightsIntakeId: null,
  affectedCountryCodes: [],
  affectedLanguages: [],
  claimedWorkTitle: null,
  claimedWorkAuthor: null,
  descriptionRu: 'Требование удалить текст',
  assignedToUserId: null,
  blocksPublication: true,
  requiresLawyerReview: false,
  resolution: null,
  isOpen: true,
  isOverdue: false,
  daysUntilDeadline: 6,
  activeBlocksCount: 1,
  hasWorldwideBlock: true,
  blockedCountryCodes: [],
  createdAt: '2026-07-20T00:00:00.000Z',
  updatedAt: '2026-07-20T00:00:00.000Z',
  ...overrides,
});

describe('RightsClaimsList', () => {
  it('renders the claims table with totals', () => {
    mockUseRightsClaims.mockReturnValue({
      data: { items: [makeClaim()], pagination: { page: 1, limit: 20, total: 1, totalPages: 1 } },
      isLoading: false,
      error: null,
    });

    render(<RightsClaimsList lang="en" />);

    expect(screen.getByText('Rights Claims')).toBeInTheDocument();
    expect(screen.getByTestId('claim-list-row-claim-1')).toBeInTheDocument();
    expect(screen.getByText('CLM-2026-000001')).toBeInTheDocument();
    expect(screen.getByText('Показано 1 из 1 претензий')).toBeInTheDocument();
    expect(screen.getByText('весь мир')).toBeInTheDocument();
  });

  it('passes openOnly to the query when the filter is toggled', () => {
    mockUseRightsClaims.mockReturnValue({
      data: { items: [makeClaim()], pagination: { page: 1, limit: 20, total: 1, totalPages: 1 } },
      isLoading: false,
      error: null,
    });

    render(<RightsClaimsList lang="en" />);
    mockUseRightsClaims.mockClear();

    fireEvent.click(screen.getByText('Только открытые'));

    expect(mockUseRightsClaims).toHaveBeenCalledWith(
      expect.objectContaining({ openOnly: true, page: 1 })
    );
  });

  /**
   * `LEGACY-408`: `openOnly`/`overdueOnly` требуют открытый статус на бэкенде -
   * выбор закрытого статуса вместе с одним из них раньше давал пустой список без объяснения.
   */
  it('гасит «только открытые» и «только просроченные», когда выбран закрытый статус', () => {
    mockUseRightsClaims.mockReturnValue({
      data: { items: [makeClaim()], pagination: { page: 1, limit: 20, total: 1, totalPages: 1 } },
      isLoading: false,
      error: null,
    });

    render(<RightsClaimsList lang="en" />);

    // Оба флага должны реально стоять в `true` до смены статуса, иначе проверка
    // на `undefined` пройдёт и без сброса — ветка осталась бы непокрытой.
    fireEvent.click(screen.getByText('Только открытые'));
    fireEvent.click(screen.getByText('Только просроченные'));
    expect(mockUseRightsClaims).toHaveBeenLastCalledWith(
      expect.objectContaining({ openOnly: true, overdueOnly: true })
    );

    fireEvent.change(screen.getByDisplayValue('Все статусы'), {
      target: { value: 'CLOSED' },
    });

    expect(mockUseRightsClaims).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: 'CLOSED', openOnly: undefined, overdueOnly: undefined })
    );
    expect(screen.getByText('Только открытые')).toBeDisabled();
    expect(screen.getByText('Только просроченные')).toBeDisabled();
    expect(
      screen.getByText(
        'Выбранный статус закрыт: «только открытые» и «только просроченные» с ним не совпадут.'
      )
    ).toBeInTheDocument();

    // Возврат к открытому статусу снова включает оба контрола.
    fireEvent.change(screen.getByDisplayValue('Закрыта'), { target: { value: '' } });

    expect(screen.getByText('Только открытые')).toBeEnabled();
    expect(screen.getByText('Только просроченные')).toBeEnabled();
  });

  it('renders the empty state when nothing matches', () => {
    mockUseRightsClaims.mockReturnValue({
      data: { items: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } },
      isLoading: false,
      error: null,
    });

    render(<RightsClaimsList lang="en" />);

    expect(screen.getByText('Претензии не найдены.')).toBeInTheDocument();
  });
});
