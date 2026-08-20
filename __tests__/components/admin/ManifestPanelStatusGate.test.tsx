import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ManifestPanel } from '@/components/admin/RightsIntakeDetail/ManifestPanel/ManifestPanel';

/**
 * WP-10.3 (R4-06): панель отключала кнопки только для DRAFT. Для остальных запрещённых
 * статусов кнопки были активны и упирались в 400 бэкенда вместо объяснения, которого
 * требует ТЗ фазы 2. Белый список — только READY_FOR_AGENT.
 */

vi.mock('@/api/hooks/useRightsIntakes', () => ({
  useRightsAgentManifest: () => ({
    isFetching: false,
    refetch: vi.fn(),
  }),
  // WP-F.5: панель показывает пробелы интейка; статусный гейт от них не зависит.
  useRightsIntakeReadiness: () => ({ data: undefined, isLoading: false }),
}));

const EXPORT_BUTTONS = ['Preview Manifest', 'Copy JSON', 'Download JSON'];

const forbiddenStatuses = [
  'REVIEW_IMPORTED',
  'HUMAN_REVIEW_REQUIRED',
  'LAWYER_REVIEW_REQUIRED',
  'APPROVED',
  'REJECTED',
  'BOOK_CREATED',
  'ARCHIVED',
];

describe('ManifestPanel status gate (WP-10.3 / R4-06)', () => {
  it.each(forbiddenStatuses)('disables manifest export for %s and explains why', (status) => {
    render(<ManifestPanel intakeId="intake-1" workflowStatus={status} />);

    for (const label of EXPORT_BUTTONS) {
      expect(screen.getByRole('button', { name: label })).toBeDisabled();
    }
    expect(
      screen.getByText('Manifest export is available only for intakes in Ready For Agent status.')
    ).toBeInTheDocument();
  });

  it('keeps the DRAFT hint from the phase 2 spec', () => {
    render(<ManifestPanel intakeId="intake-1" workflowStatus="DRAFT" />);

    expect(screen.getByText(/This intake is still a/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Preview Manifest' })).toBeDisabled();
  });

  /**
   * WP-M.2: сам переход в READY_FOR_AGENT доступен из этой же панели. Кнопка была только
   * в шапке страницы, а неактивные кнопки выгрузки стояли под списком пробелов интейка —
   * и читались как «разблокируются, когда пробелы закроешь».
   */
  it('offers the DRAFT → READY_FOR_AGENT transition right in the panel', () => {
    const onMarkReady = vi.fn();
    render(<ManifestPanel intakeId="intake-1" workflowStatus="DRAFT" onMarkReady={onMarkReady} />);

    const button = screen.getByRole('button', { name: 'Mark Ready For Agent' });
    fireEvent.click(button);

    expect(onMarkReady).toHaveBeenCalledTimes(1);
  });

  it('says the intake gaps do not block the export', () => {
    render(<ManifestPanel intakeId="intake-1" workflowStatus="DRAFT" />);

    expect(screen.getByText(/the gaps listed below do not block it/)).toBeInTheDocument();
  });

  it('shows why the transition failed instead of leaving the button silent', () => {
    render(
      <ManifestPanel
        intakeId="intake-1"
        workflowStatus="DRAFT"
        onMarkReady={vi.fn()}
        markReadyError="Cannot transition from 'DRAFT' to 'READY_FOR_AGENT'."
      />
    );

    expect(
      screen.getByText("Cannot transition from 'DRAFT' to 'READY_FOR_AGENT'.")
    ).toBeInTheDocument();
  });

  it('does not offer the transition for a status that is not DRAFT', () => {
    render(<ManifestPanel intakeId="intake-1" workflowStatus="APPROVED" onMarkReady={vi.fn()} />);

    expect(screen.queryByRole('button', { name: 'Mark Ready For Agent' })).toBeNull();
  });

  it('enables export for READY_FOR_AGENT', () => {
    render(<ManifestPanel intakeId="intake-1" workflowStatus="READY_FOR_AGENT" />);

    for (const label of EXPORT_BUTTONS) {
      expect(screen.getByRole('button', { name: label })).toBeEnabled();
    }
  });
});
