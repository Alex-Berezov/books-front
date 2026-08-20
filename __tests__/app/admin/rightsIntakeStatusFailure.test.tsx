import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import RightsIntakeDetailPage from '@/app/admin/[lang]/rights-intakes/[id]/page';

/**
 * WP-M.2: отказ смены статуса не был виден нигде. `mutateAsync` без `catch` роняет
 * необработанный промис в консоль, кнопка возвращается в исходный вид — и картинка для
 * редактора совпадает с бездействием: «нажимаю, ничего не происходит».
 *
 * Тест держит именно это: не отрисовку готовой строки, а то, что отказ мутации доходит
 * до экрана. Убери `try/catch` в обработчиках — тест краснеет.
 */

const changeStatus = vi.fn();

vi.mock('next/navigation', () => ({
  useParams: () => ({ lang: 'en', id: 'intake-1' }),
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
}));

vi.mock('next-auth/react', () => ({
  useSession: () => ({ data: { user: { roles: ['ADMIN'] } } }),
}));

vi.mock('@/api/hooks/useRightsIntakes', () => ({
  useRightsIntake: () => ({
    data: {
      id: 'intake-1',
      candidateTitle: 'Преступление и наказание',
      candidateAuthor: 'Фёдор Достоевский',
      workflowStatus: 'DRAFT',
      createdBookId: null,
    },
    isLoading: false,
    error: null,
  }),
  useChangeRightsIntakeStatus: () => ({ mutateAsync: changeStatus, isPending: false }),
  useArchiveRightsIntake: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useForceArchiveRightsIntake: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useRightsReviewImports: () => ({ data: { items: [] } }),
  useCurrentRightsProfile: () => ({ data: null, refetch: vi.fn() }),
  useRightsAgentManifest: () => ({ isFetching: false, refetch: vi.fn() }),
  useRightsIntakeReadiness: () => ({ data: undefined, isLoading: false }),
}));

vi.mock('@/api/hooks/useRightsLawyer', () => ({
  useProfileRiskAssessment: () => ({ data: null }),
}));

// Соседние панели к этому тесту отношения не имеют и тянут собственную сеть.
vi.mock('@/components/admin/rights-intakes/RightsIntakeForm/RightsIntakeForm', () => ({
  RightsIntakeForm: () => null,
}));
vi.mock('@/components/admin/RightsIntakeDetail/AgentAutomationPanel/AgentAutomationPanel', () => ({
  AgentAutomationPanel: () => null,
}));
vi.mock('@/components/admin/RightsIntakeDetail/ApprovalHistory/ApprovalHistory', () => ({
  ApprovalHistory: () => null,
}));
vi.mock('@/components/admin/RightsIntakeDetail/ApprovalPanel/ApprovalPanel', () => ({
  ApprovalPanel: () => null,
}));
vi.mock('@/components/admin/RightsIntakeDetail/ApprovalState/ApprovalState', () => ({
  ApprovalState: () => null,
}));
vi.mock(
  '@/components/admin/RightsIntakeDetail/CreateBookFromClearanceForm/CreateBookFromClearanceForm',
  () => ({ CreateBookFromClearanceForm: () => null })
);
vi.mock('@/components/admin/RightsIntakeDetail/IntakeOverview/IntakeOverview', () => ({
  IntakeOverview: () => null,
}));
vi.mock('@/components/admin/RightsIntakeDetail/LawyerReviewPanel/LawyerReviewPanel', () => ({
  LawyerReviewPanel: () => null,
}));
vi.mock('@/components/admin/RightsIntakeDetail/RecheckPanel/RecheckPanel', () => ({
  RecheckPanel: () => null,
}));
vi.mock('@/components/admin/RightsIntakeDetail/ReviewChainPanel/ReviewChainPanel', () => ({
  ReviewChainPanel: () => null,
}));
vi.mock('@/components/admin/RightsIntakeDetail/ReviewImportPanel/ReviewImportPanel', () => ({
  ReviewImportPanel: () => null,
}));
vi.mock('@/components/admin/RightsIntakeDetail/RightsProfilePanel/RightsProfilePanel', () => ({
  RightsProfilePanel: () => null,
}));
vi.mock('@/components/admin/RightsIntakeDetail/WorkflowTimeline/WorkflowTimeline', () => ({
  WorkflowTimeline: () => null,
}));

describe('Страница интейка: отказ перехода в READY_FOR_AGENT виден', () => {
  beforeEach(() => {
    changeStatus.mockReset();
  });

  it('показывает сообщение бэкенда, когда переход отклонён', async () => {
    changeStatus.mockRejectedValue(
      new Error("Cannot transition from 'DRAFT' to 'READY_FOR_AGENT'")
    );
    render(<RightsIntakeDetailPage />);

    fireEvent.click(screen.getAllByRole('button', { name: 'Mark Ready For Agent' })[0]);

    await waitFor(() => {
      expect(
        screen.getAllByText("Cannot transition from 'DRAFT' to 'READY_FOR_AGENT'").length
      ).toBeGreaterThan(0);
    });
    expect(changeStatus).toHaveBeenCalledTimes(1);
  });

  it('подставляет свой текст, когда у отказа нет сообщения', async () => {
    changeStatus.mockRejectedValue(new Error(''));
    render(<RightsIntakeDetailPage />);

    fireEvent.click(screen.getAllByRole('button', { name: 'Mark Ready For Agent' })[0]);

    await waitFor(() => {
      expect(
        screen.getAllByText('Failed to mark the intake as Ready For Agent.').length
      ).toBeGreaterThan(0);
    });
  });

  it('при успешном переходе ничего не показывает', async () => {
    changeStatus.mockResolvedValue({ id: 'intake-1' });
    render(<RightsIntakeDetailPage />);

    fireEvent.click(screen.getAllByRole('button', { name: 'Mark Ready For Agent' })[0]);

    await waitFor(() => expect(changeStatus).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
