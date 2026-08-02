import { render, screen } from '@testing-library/react';
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

    expect(screen.getByText(/Mark this intake as/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Preview Manifest' })).toBeDisabled();
  });

  it('enables export for READY_FOR_AGENT', () => {
    render(<ManifestPanel intakeId="intake-1" workflowStatus="READY_FOR_AGENT" />);

    for (const label of EXPORT_BUTTONS) {
      expect(screen.getByRole('button', { name: label })).toBeEnabled();
    }
  });
});
