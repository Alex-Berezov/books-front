import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReportPdfPanel } from '@/components/admin/RightsIntakeDetail/ReportPdfPanel/ReportPdfPanel';
import type { RightsReviewImportDetail } from '@/types/api-schema/rights-intake';

const mocks = vi.hoisted(() => ({
  detail: null as RightsReviewImportDetail | null,
  uploadReportPdf: vi.fn().mockResolvedValue({}),
  downloadReportPdf: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/api/hooks/useRightsIntakes', () => ({
  useRightsReviewImportDetail: () => ({ data: mocks.detail, isLoading: false }),
}));

vi.mock('@/api/hooks/useRightsFiles', () => ({
  useRightsFileLimits: () => ({
    data: {
      maxSizeMb: 25,
      allowedContentTypes: {
        reportPdf: ['application/pdf'],
        sourceFile: ['application/pdf', 'text/plain'],
        evidence: ['application/pdf'],
      },
    },
  }),
  useUploadRightsReportPdf: () => ({ mutateAsync: mocks.uploadReportPdf, isPending: false }),
}));

vi.mock('@/api/endpoints/admin/rights-files', () => ({
  downloadRightsReportPdf: mocks.downloadReportPdf,
}));

const makeDetail = (overrides: Partial<RightsReviewImportDetail> = {}): RightsReviewImportDetail =>
  ({
    id: 'import-1',
    rightsIntakeId: 'intake-1',
    schemaVersion: '1.0',
    importStatus: 'VALIDATED',
    isCurrent: true,
    sourceFileName: 'report.json',
    validationErrorsCount: 0,
    validationWarningsCount: 0,
    importedByUserId: null,
    supersededAt: null,
    createdAt: '2026-08-01T10:00:00.000Z',
    updatedAt: '2026-08-01T10:00:00.000Z',
    reportJson: {},
    reportMarkdown: null,
    rawAgentOutput: null,
    reportJsonSha256: null,
    reportMarkdownSha256: null,
    rawAgentOutputSha256: null,
    validationErrors: null,
    validationWarnings: null,
    hasReportPdf: false,
    ...overrides,
  }) as RightsReviewImportDetail;

// WP-9.2: .json и .md панель импорта читает FileReader'ом и шлёт текстом; PDF — настоящая
// загрузка бинарного файла на сервер, который сам считает его контрольную сумму.
describe('ReportPdfPanel (WP-9.2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.detail = makeDetail();
  });

  it('asks for a review import first when there is none', () => {
    render(<ReportPdfPanel importId={null} />);

    expect(screen.getByText(/Сначала импортируйте JSON-отчёт агента/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Загрузить PDF/)).not.toBeInTheDocument();
  });

  it('uploads the PDF to the server and warns that replacement is forbidden', async () => {
    render(<ReportPdfPanel importId="import-1" />);

    expect(screen.getByText('Не загружен')).toBeInTheDocument();
    expect(screen.getByText(/загрузите его новым импортом/)).toBeInTheDocument();

    const file = new File(['%PDF-1.7'], 'report.pdf', { type: 'application/pdf' });
    await act(async () => {
      fireEvent.change(screen.getByLabelText(/Загрузить PDF/), { target: { files: [file] } });
    });

    expect(mocks.uploadReportPdf).toHaveBeenCalledWith({ importId: 'import-1', file });
  });

  it('shows the stored descriptor and downloads through the admin endpoint', async () => {
    mocks.detail = makeDetail({
      hasReportPdf: true,
      reportPdfFileName: 'clearance.pdf',
      reportPdfSha256: '0123456789abcdef0123456789abcdef',
      reportPdfSizeBytes: 1024,
      reportPdfUploadedAt: '2026-08-01T12:00:00.000Z',
      agentModel: 'gpt-5',
      promptVersion: 'rights-v3',
    });

    render(<ReportPdfPanel importId="import-1" />);

    expect(screen.getByText('Загружен')).toBeInTheDocument();
    expect(screen.getByText('clearance.pdf')).toBeInTheDocument();
    expect(screen.getByText('0123456789ab')).toBeInTheDocument();
    expect(screen.getByText(/модель: gpt-5/)).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Скачать файл/ }));
    });

    expect(mocks.downloadReportPdf).toHaveBeenCalledWith('import-1');
  });
});
