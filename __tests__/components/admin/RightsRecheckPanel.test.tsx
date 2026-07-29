import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RightsRecheckPanel } from '@/components/admin/books/RightsRecheckPanel/RightsRecheckPanel';
import type { VersionRecheckEvaluation } from '@/types/api-schema/rights-recheck';

const mockUseVersionRecheck = vi.fn();

vi.mock('@/api/hooks/useRightsRecheck', () => ({
  useVersionRecheck: () => mockUseVersionRecheck(),
  useCompleteRightsRecheckTask: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDismissRightsRecheckTask: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useSnoozeRightsRecheckTask: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

const makeEvaluation = (
  overrides: Partial<VersionRecheckEvaluation> = {}
): VersionRecheckEvaluation => ({
  versionId: 'v1',
  blockers: [],
  warnings: [],
  openTasksCount: 0,
  overdueTasksCount: 0,
  blockingTasksCount: 0,
  nextRecheckDueAt: null,
  taskIds: [],
  tasks: [],
  schedule: null,
  ...overrides,
});

describe('RightsRecheckPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseVersionRecheck.mockReturnValue({ data: makeEvaluation() });
  });

  it('reports that no recheck is required for an empty evaluation', () => {
    render(<RightsRecheckPanel versionId="v1" />);

    expect(screen.getByText(/Перепроверка не требуется/)).toBeInTheDocument();
    expect(screen.getByText('Задач перепроверки по этой версии нет.')).toBeInTheDocument();
  });

  it('renders blockers and warnings with their codes and messages', () => {
    mockUseVersionRecheck.mockReturnValue({
      data: makeEvaluation({
        openTasksCount: 1,
        blockers: [
          {
            code: 'RIGHTS_RECHECK_OVERDUE',
            messageRu: 'Перепроверка прав просрочена.',
            taskId: 'task-1',
            details: null,
          },
        ],
        warnings: [
          {
            code: 'RIGHTS_RECHECK_DUE_SOON',
            messageRu: 'Приближается плановый срок перепроверки прав.',
            taskId: null,
            details: null,
          },
        ],
      }),
    });

    render(<RightsRecheckPanel versionId="v1" />);

    expect(screen.getByText('RIGHTS_RECHECK_OVERDUE')).toBeInTheDocument();
    expect(screen.getByText('Перепроверка прав просрочена.')).toBeInTheDocument();
    expect(screen.getByText('RIGHTS_RECHECK_DUE_SOON')).toBeInTheDocument();
    expect(screen.getByText('Приближается плановый срок перепроверки прав.')).toBeInTheDocument();
  });

  it('shows the open and overdue task counters', () => {
    mockUseVersionRecheck.mockReturnValue({
      data: makeEvaluation({ openTasksCount: 3, overdueTasksCount: 2 }),
    });

    render(<RightsRecheckPanel versionId="v1" />);

    expect(screen.getByText(/Открытых задач: 3/)).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });
});
