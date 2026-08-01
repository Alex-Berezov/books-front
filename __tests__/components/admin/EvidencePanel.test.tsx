import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EvidencePanel } from '@/components/admin/RightsIntakeDetail/EvidencePanel/EvidencePanel';
import type { RightsEvidence } from '@/types/api-schema/rights-intake';

const mocks = vi.hoisted(() => ({
  uploadArchiveCopy: vi.fn().mockResolvedValue({}),
  supersede: vi.fn().mockResolvedValue({}),
  downloadArchiveCopy: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/api/hooks/useRightsFiles', () => ({
  useRightsFileLimits: () => ({
    data: {
      maxSizeMb: 25,
      allowedContentTypes: {
        reportPdf: ['application/pdf'],
        sourceFile: ['application/pdf'],
        evidence: ['application/pdf', 'text/html'],
      },
    },
  }),
  useUploadRightsEvidenceArchiveCopy: () => ({
    mutateAsync: mocks.uploadArchiveCopy,
    isPending: false,
  }),
  useSupersedeRightsEvidence: () => ({ mutateAsync: mocks.supersede, isPending: false }),
}));

vi.mock('@/api/endpoints/admin/rights-files', () => ({
  downloadRightsEvidenceArchiveCopy: mocks.downloadArchiveCopy,
}));

const makeEvidence = (overrides: Partial<RightsEvidence> = {}): RightsEvidence => ({
  id: 'evidence-1',
  rightsProfileId: 'profile-1',
  evidenceType: 'LAW',
  sourceLevel: 'PRIMARY',
  title: 'Закон об авторском праве',
  authority: 'Минкультуры',
  url: 'https://example.org/law',
  jurisdictionCode: 'RU',
  accessedAt: null,
  relevantExcerpt: null,
  summaryRu: 'Срок охраны — 70 лет.',
  createdAt: '2026-08-01T10:00:00.000Z',
  updatedAt: '2026-08-01T10:00:00.000Z',
  ...overrides,
});

// WP-9.3: доказательство хранилось одним URL, который завтра отдаст 404 вместе с обоснованием
// блокировки страны; удалить доказательство нельзя (ADR-009) — только пометить заменённым.
describe('EvidencePanel (WP-9.3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('offers to upload the archived copy when there is none', async () => {
    render(<EvidencePanel evidence={[makeEvidence()]} />);

    expect(screen.getByText('Не загружен')).toBeInTheDocument();

    const file = new File(['<html></html>'], 'law.html', { type: 'text/html' });
    await act(async () => {
      fireEvent.change(screen.getByLabelText(/Загрузить архивную копию/), {
        target: { files: [file] },
      });
    });

    expect(mocks.uploadArchiveCopy).toHaveBeenCalledWith({ evidenceId: 'evidence-1', file });
  });

  it('marks the evidence as having an archived copy and downloads it', async () => {
    render(
      <EvidencePanel
        evidence={[
          makeEvidence({
            isArchivedCopy: true,
            fileName: 'law.pdf',
            fileSha256: 'fedcba9876543210fedcba9876543210',
            sizeBytes: 4096,
            archivedAt: '2026-08-01T12:00:00.000Z',
          }),
        ]}
      />
    );

    expect(screen.getByText('Архивная копия есть')).toBeInTheDocument();
    expect(screen.getByText('law.pdf')).toBeInTheDocument();
    expect(screen.getByText('fedcba987654')).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Скачать файл/ }));
    });

    expect(mocks.downloadArchiveCopy).toHaveBeenCalledWith('evidence-1');
  });

  it('shows the superseded marker and names the successor', () => {
    render(
      <EvidencePanel
        evidence={[
          makeEvidence({ isCurrent: false, supersededById: 'evidence-2' }),
          makeEvidence({ id: 'evidence-2', title: 'Редакция закона 2026 года' }),
        ]}
      />
    );

    expect(screen.getByText('Заменено')).toBeInTheDocument();
    expect(
      screen.getByText(/Заменено доказательством: Редакция закона 2026 года/)
    ).toBeInTheDocument();
  });

  it('keeps the supersede button disabled until a successor is chosen', async () => {
    render(
      <EvidencePanel
        evidence={[makeEvidence(), makeEvidence({ id: 'evidence-2', title: 'Новое решение суда' })]}
      />
    );

    const buttons = screen.getAllByRole('button', { name: 'Пометить заменённым' });
    expect(buttons[0]).toBeDisabled();

    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'evidence-2' } });
    expect(buttons[0]).toBeEnabled();

    await act(async () => {
      fireEvent.click(buttons[0]);
    });

    expect(mocks.supersede).toHaveBeenCalledWith({
      evidenceId: 'evidence-1',
      supersededById: 'evidence-2',
    });
  });
});
