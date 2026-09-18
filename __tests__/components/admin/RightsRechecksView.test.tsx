import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RightsRechecksView } from '@/components/admin/rights-rechecks/RightsRechecksView/RightsRechecksView';

const mockUseRightsRecheckTasks = vi.fn();
const mockSession = vi.fn();

vi.mock('next-auth/react', () => ({
  useSession: () => mockSession(),
}));

const emptyPage = { items: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } };

vi.mock('@/api/hooks/useRightsRecheck', () => ({
  useRightsRecheckTasks: (params: unknown) => mockUseRightsRecheckTasks(params),
  useRecheckScanRuns: () => ({ data: emptyPage }),
  useRightsLegalChanges: () => ({ data: emptyPage }),
  useStartRightsRecheckTask: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useCompleteRightsRecheckTask: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDismissRightsRecheckTask: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useSnoozeRightsRecheckTask: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useRunRecheckScan: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useCreateRightsLegalChange: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useApplyRightsLegalChange: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useArchiveRightsLegalChange: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

describe('RightsRechecksView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession.mockReturnValue({ data: { user: { roles: ['admin'] } } });
    mockUseRightsRecheckTasks.mockReturnValue({
      data: emptyPage,
      isLoading: false,
      isError: false,
    });
  });

  /**
   * `LEGACY-408`: `overdueOnly` требует открытый статус на бэкенде (`RECHECK_OPEN_WHERE`) -
   * выбор терминального статуса («выполнена»/«отклонена») вместе с ним раньше давал пустой
   * список без объяснения.
   */
  it.each(['COMPLETED', 'DISMISSED'])(
    'гасит «только просроченные», когда выбран терминальный статус %s',
    (status) => {
      render(<RightsRechecksView lang="en" />);

      fireEvent.click(screen.getByLabelText('Только просроченные'));
      expect(mockUseRightsRecheckTasks).toHaveBeenLastCalledWith(
        expect.objectContaining({ overdueOnly: true })
      );

      fireEvent.change(screen.getByLabelText('Статус'), { target: { value: status } });

      expect(mockUseRightsRecheckTasks).toHaveBeenLastCalledWith(
        expect.objectContaining({ status, overdueOnly: undefined })
      );
      expect(screen.getByLabelText('Только просроченные')).toBeDisabled();
      expect(
        screen.getByText('Выбранный статус закрыт: «только просроченные» с ним не совпадёт.')
      ).toBeInTheDocument();

      // Возврат к открытому статусу снова включает чекбокс.
      fireEvent.change(screen.getByLabelText('Статус'), { target: { value: 'PENDING' } });
      expect(screen.getByLabelText('Только просроченные')).toBeEnabled();
    }
  );
});
