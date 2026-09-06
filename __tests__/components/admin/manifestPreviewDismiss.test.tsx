import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ManifestPanel } from '@/components/admin/RightsIntakeDetail/ManifestPanel/ManifestPanel';

const manifest = { intakeId: 'intake-1', candidateTitle: 'Война и мир' };

vi.mock('@/api/hooks/useRightsIntakes', () => ({
  useRightsAgentManifest: () => ({
    isFetching: false,
    refetch: vi.fn(async () => ({ data: manifest, error: null })),
  }),
  useRightsIntakeReadiness: () => ({
    data: { intakeId: 'intake-1', isReady: true, missing: [], warnings: [] },
    isLoading: false,
  }),
}));

const openPreview = async () => {
  fireEvent.click(screen.getByRole('button', { name: /preview/i }));
  await waitFor(() => expect(screen.getByText('Agent Manifest Preview')).toBeInTheDocument());
};

/**
 * 🔴 `LEGACY-041`: клик внутри окна гасился `stopPropagation` — обработчиком на элементе,
 * нажимать который не предполагается, а Escape висел на подложке и не срабатывал вовсе,
 * потому что фокус после открытия оставался на кнопке «Preview».
 *
 * Сторож краснеет на возврате обоих: подложка, закрывающая окно по любому долетевшему
 * клику, и снятый перенос фокуса.
 */
describe('превью манифеста: закрытие окна', () => {
  it('клик по содержимому окно не закрывает, клик по подложке — закрывает', async () => {
    render(<ManifestPanel intakeId="intake-1" workflowStatus="READY_FOR_AGENT" />);
    await openPreview();

    fireEvent.click(screen.getByText('Agent Manifest Preview'));
    expect(screen.getByText('Agent Manifest Preview')).toBeInTheDocument();

    const dialog = document.querySelector('[tabindex="-1"]') as HTMLElement;
    fireEvent.click(dialog.parentElement as HTMLElement);

    await waitFor(() => expect(screen.queryByText('Agent Manifest Preview')).toBeNull());
  });

  it('окно забирает фокус, и Escape из него закрывает окно', async () => {
    render(<ManifestPanel intakeId="intake-1" workflowStatus="READY_FOR_AGENT" />);
    await openPreview();

    const dialog = document.querySelector('[tabindex="-1"]') as HTMLElement;
    expect(document.activeElement).toBe(dialog);

    fireEvent.keyDown(document.activeElement as HTMLElement, { key: 'Escape' });

    await waitFor(() => expect(screen.queryByText('Agent Manifest Preview')).toBeNull());
  });
});
