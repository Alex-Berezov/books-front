import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LegalReviewsInbox } from '@/components/admin/rights-lawyer/LegalReviewsInbox/LegalReviewsInbox';
import type { RightsLawyerReview } from '@/types/api-schema/rights-lawyer';

const mockUseLawyerReviews = vi.fn();
const mockScan = vi.fn();
const mockSession = vi.fn();

vi.mock('next-auth/react', () => ({
  useSession: () => mockSession(),
}));

vi.mock('@/api/hooks/useRightsLawyer', () => ({
  useLawyerReviews: (params: unknown) => mockUseLawyerReviews(params),
  useLawyers: () => ({
    data: {
      items: [{ id: 'lawyer-1', fullName: 'Иванова' }],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    },
  }),
  useRunLawyerExpiryScan: () => ({ mutateAsync: mockScan, isPending: false }),
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

const makeReview = (overrides: Partial<RightsLawyerReview> = {}): RightsLawyerReview => ({
  id: 'lr-1',
  reviewNumber: 'LR-2026-000001',
  status: 'PENDING',
  effectiveStatus: 'PENDING',
  trigger: 'HIGH_RISK_POLICY',
  riskLevel: 'HIGH',
  rightsProfileId: 'profile-1',
  rightsIntakeId: 'intake-1',
  rightsReviewId: null,
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
  assignedLawyerId: null,
  assignedLawyerName: null,
  assignedAt: null,
  startedAt: null,
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
  updatedAt: '2026-07-01T00:00:00.000Z',
  ...overrides,
});

describe('LegalReviewsInbox', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession.mockReturnValue({ data: { user: { roles: ['admin'] } } });
    mockUseLawyerReviews.mockReturnValue({
      data: { items: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } },
      isLoading: false,
      isError: false,
    });
  });

  it('shows the empty state when nothing matches the filters', () => {
    render(<LegalReviewsInbox />);

    expect(screen.getByText('Юридических проверок по этим фильтрам нет.')).toBeInTheDocument();
  });

  it('renders a review row with its number and risk level', () => {
    mockUseLawyerReviews.mockReturnValue({
      data: { items: [makeReview()], pagination: { page: 1, limit: 20, total: 1, totalPages: 1 } },
      isLoading: false,
      isError: false,
    });

    render(<LegalReviewsInbox />);

    expect(screen.getByRole('button', { name: 'LR-2026-000001' })).toBeInTheDocument();
    expect(screen.getByText('Гамлет')).toBeInTheDocument();
    // The label also appears in the status filter, so scope the assertion to the table row.
    expect(within(screen.getByRole('table')).getByText('Ожидает юриста')).toBeInTheDocument();
    expect(within(screen.getByRole('table')).getByText('HIGH')).toBeInTheDocument();
  });

  /**
   * Число страниц берётся у сервера (`LEGACY-177`) и здесь не пересчитывается:
   * правило округления живёт в одном месте — `paginated()` на бэкенде.
   * Ответ прежней формы до экрана не доходит вовсе: его сворачивает
   * `lib/api/paginated-envelope.ts` в слое данных, и проверяется это там же
   * (`__tests__/api/paginatedEnvelope.test.ts`).
   */
  it('берёт число страниц у сервера, а не считает делением', () => {
    mockUseLawyerReviews.mockReturnValue({
      // 41 строка при размере страницы 20 — это три страницы, но сервер
      // сообщает семь: подпись обязана повторить сервер, а не пересчитать.
      data: { items: [makeReview()], pagination: { page: 1, limit: 20, total: 41, totalPages: 7 } },
      isLoading: false,
      isError: false,
    });

    render(<LegalReviewsInbox />);

    expect(screen.getByText(/Страница 1 из 7/)).toBeInTheDocument();
  });

  it('пустая выдача не даёт «страница 1 из 0»', () => {
    mockUseLawyerReviews.mockReturnValue({
      data: { items: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } },
      isLoading: false,
      isError: false,
    });

    render(<LegalReviewsInbox />);

    // Пагинатор скрыт целиком, пока строк меньше страницы, — подписи нет вовсе.
    expect(screen.queryByText(/Страница/)).not.toBeInTheDocument();
  });

  it('passes the selected status filter to the query', async () => {
    const user = userEvent.setup();
    render(<LegalReviewsInbox />);

    await user.selectOptions(screen.getByLabelText('Статус'), 'IN_PROGRESS');

    expect(mockUseLawyerReviews).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: 'IN_PROGRESS', page: 1 })
    );
  });

  it('passes the "mine" and "overdue" toggles to the query', async () => {
    const user = userEvent.setup();
    render(<LegalReviewsInbox />);

    await user.click(screen.getByLabelText('Только мои'));
    await user.click(screen.getByLabelText('Только просроченные'));

    expect(mockUseLawyerReviews).toHaveBeenLastCalledWith(
      expect.objectContaining({ mine: true, overdueOnly: true })
    );
  });

  /**
   * `LEGACY-408`: `mine` и `assignedLawyerId` складываются через `AND` на бэкенде -
   * выбор чужого юриста вместе с «только мои» раньше давал пустой список без объяснения.
   */
  it('снимает выбранного юриста и гасит список, когда включена «только мои»', async () => {
    const user = userEvent.setup();
    render(<LegalReviewsInbox />);

    await user.selectOptions(screen.getByLabelText('Юрист'), 'lawyer-1');
    expect(mockUseLawyerReviews).toHaveBeenLastCalledWith(
      expect.objectContaining({ assignedLawyerId: 'lawyer-1' })
    );

    await user.click(screen.getByLabelText('Только мои'));

    expect(screen.getByLabelText('Юрист')).toBeDisabled();
    expect(mockUseLawyerReviews).toHaveBeenLastCalledWith(expect.objectContaining({ mine: true }));
    expect(mockUseLawyerReviews).toHaveBeenLastCalledWith(
      expect.not.objectContaining({ assignedLawyerId: expect.anything() })
    );
  });

  /**
   * Четвёртая пара того же класса на том же экране (решение арбитра 18.09.2026):
   * `overdueOnly` бэкенд кладёт в `AND` с `LAWYER_REVIEW_OPEN_WHERE` = `PENDING`/`IN_PROGRESS`,
   * поэтому с закрытым статусом пересечение пусто всегда.
   */
  it.each(['APPROVED', 'REJECTED', 'EXPIRED'])(
    'гасит «только просроченные», когда выбран закрытый статус %s',
    async (closedStatus) => {
      const user = userEvent.setup();
      render(<LegalReviewsInbox />);

      await user.click(screen.getByLabelText('Только просроченные'));
      expect(mockUseLawyerReviews).toHaveBeenLastCalledWith(
        expect.objectContaining({ overdueOnly: true })
      );

      await user.selectOptions(screen.getByLabelText('Статус'), closedStatus);

      expect(mockUseLawyerReviews).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: closedStatus })
      );
      expect(mockUseLawyerReviews).toHaveBeenLastCalledWith(
        expect.not.objectContaining({ overdueOnly: expect.anything() })
      );
      expect(screen.getByLabelText('Только просроченные')).toBeDisabled();

      // Возврат к открытому статусу снова включает чекбокс.
      await user.selectOptions(screen.getByLabelText('Статус'), 'PENDING');
      expect(screen.getByLabelText('Только просроченные')).toBeEnabled();
    }
  );

  it('снятие «только мои» возвращает список юриста в рабочее состояние', async () => {
    const user = userEvent.setup();
    render(<LegalReviewsInbox />);

    await user.click(screen.getByLabelText('Только мои'));
    expect(screen.getByLabelText('Юрист')).toBeDisabled();

    await user.click(screen.getByLabelText('Только мои'));
    expect(screen.getByLabelText('Юрист')).toBeEnabled();
  });

  it('passes the expiry window to the query', async () => {
    const user = userEvent.setup();
    render(<LegalReviewsInbox />);

    await user.type(screen.getByLabelText('Истекают в течение, дней'), '30');

    expect(mockUseLawyerReviews).toHaveBeenLastCalledWith(
      expect.objectContaining({ expiringWithinDays: 30 })
    );
  });

  it('shows the expiry scan button only to an admin', () => {
    const { unmount } = render(<LegalReviewsInbox />);
    expect(screen.getByRole('button', { name: 'Скан истечений' })).toBeInTheDocument();
    unmount();

    mockSession.mockReturnValue({ data: { user: { roles: ['lawyer'] } } });
    render(<LegalReviewsInbox />);
    expect(screen.queryByRole('button', { name: 'Скан истечений' })).not.toBeInTheDocument();
  });
});
