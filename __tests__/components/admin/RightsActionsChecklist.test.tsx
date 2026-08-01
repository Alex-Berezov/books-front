import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RightsActionsChecklist } from '@/components/admin/RightsIntakeDetail/RightsActionsChecklist/RightsActionsChecklist';
import type { RightsAction } from '@/types/api-schema/rights-intake';

const mutateAsync = vi.fn().mockResolvedValue({});

vi.mock('@/api/hooks/useRightsIntakes', () => ({
  useUpdateRightsAction: () => ({ mutateAsync, isPending: false, error: null }),
}));

const makeAction = (overrides: Partial<RightsAction> = {}): RightsAction => ({
  id: 'action-1',
  rightsProfileId: 'profile-1',
  actionType: 'OBTAIN_LICENSE',
  status: 'PENDING',
  descriptionRu: 'Получить лицензию на обложку',
  affectedCountryCodes: ['GB'],
  isBlocking: true,
  assignedToUserId: null,
  dueAt: null,
  completedAt: null,
  completedByUserId: null,
  completionNotesRu: null,
  isResolved: false,
  createdAt: '2026-08-01T10:00:00.000Z',
  updatedAt: '2026-08-01T10:00:00.000Z',
  ...overrides,
});

// WP-5.4: до этого чеклиста действие можно было только прочитать — закрыть его человеку
// было нечем, и интейк с блокирующим действием упирался в тупик (R3-02).
describe('RightsActionsChecklist (WP-5.4)', () => {
  beforeEach(() => {
    mutateAsync.mockClear();
  });

  it('shows how many actions are still blocking publication', () => {
    render(
      <RightsActionsChecklist
        actions={[makeAction(), makeAction({ id: 'action-2', isBlocking: false })]}
      />
    );

    expect(screen.getByText(/Выполнено 0 из 2/)).toBeInTheDocument();
    expect(screen.getByText(/блокируют публикацию: 1/)).toBeInTheDocument();
  });

  it('closes an action as completed', async () => {
    render(<RightsActionsChecklist actions={[makeAction()]} />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Выполнено' }));
    });

    expect(mutateAsync).toHaveBeenCalledWith({
      actionId: 'action-1',
      data: { status: 'COMPLETED' },
    });
  });

  it('keeps the waive button disabled until a comment is typed', async () => {
    render(<RightsActionsChecklist actions={[makeAction()]} />);

    const waive = screen.getByRole('button', { name: 'Отказаться' });
    expect(waive).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText(/Комментарий/), {
      target: { value: 'Лицензия не нужна.' },
    });
    expect(waive).toBeEnabled();

    await act(async () => {
      fireEvent.click(waive);
    });
    expect(mutateAsync).toHaveBeenCalledWith({
      actionId: 'action-1',
      data: { status: 'WAIVED', completionNotesRu: 'Лицензия не нужна.' },
    });
  });

  it('offers to reopen a closed action instead of closing it again', async () => {
    render(
      <RightsActionsChecklist
        actions={[
          makeAction({
            status: 'COMPLETED',
            isResolved: true,
            completedAt: '2026-08-01T12:00:00Z',
          }),
        ]}
      />
    );

    expect(screen.queryByRole('button', { name: 'Выполнено' })).not.toBeInTheDocument();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Открыть заново' }));
    });

    expect(mutateAsync).toHaveBeenCalledWith({
      actionId: 'action-1',
      data: { status: 'PENDING' },
    });
  });
});
