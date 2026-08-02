import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReviewImportPanel } from '@/components/admin/RightsIntakeDetail/ReviewImportPanel/ReviewImportPanel';
import { WorkflowTimeline } from '@/components/admin/RightsIntakeDetail/WorkflowTimeline/WorkflowTimeline';
import type {
  RightsIntake,
  RightsReviewImportDetail,
  RightsReviewImportListItem,
} from '@/types/api-schema/rights-intake';

/**
 * WP-G.9: импорт с предупреждениями принят. Экран обязан отличать его и от чистого импорта,
 * и от отказа — предупреждение не должно читаться как правовой запрет.
 */

const mocks = vi.hoisted(() => ({
  createImport: vi.fn(),
}));

vi.mock('@/api/hooks/useRightsIntakes', () => ({
  useCreateRightsReviewImport: () => ({ mutateAsync: mocks.createImport, isPending: false }),
  useRightsReviewImportDetail: () => ({ data: null, isLoading: false }),
}));

vi.mock('@/api/hooks/useRightsFiles', () => ({
  useRightsFileLimits: () => ({ data: undefined }),
  useUploadRightsReportPdf: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('@/api/endpoints/admin/rights-files', () => ({
  downloadRightsReportPdf: vi.fn(),
}));

vi.mock('@/api/endpoints/admin/rights-intakes', () => ({
  getRightsReviewImport: vi.fn(),
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
    validationWarningsCount: 1,
    importedByUserId: null,
    supersededAt: null,
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    reportJson: {},
    reportMarkdown: null,
    rawAgentOutput: null,
    reportJsonSha256: null,
    reportMarkdownSha256: null,
    rawAgentOutputSha256: null,
    validationErrors: null,
    validationWarnings: [
      {
        path: 'languageAssessments',
        message: 'Missing language assessment for target language: "fr"',
        code: 'MISSING_LANGUAGE_ASSESSMENT',
      },
    ],
    ...overrides,
  }) as RightsReviewImportDetail;

const importReport = () => {
  render(
    <ReviewImportPanel intakeId="intake-1" workflowStatus="READY_FOR_AGENT" reviewImports={[]} />
  );

  fireEvent.change(screen.getByPlaceholderText(/schemaVersion/), {
    target: { value: '{"schemaVersion":"1.0"}' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Import Review' }));
};

const makeListItem = (
  overrides: Partial<RightsReviewImportListItem> = {}
): RightsReviewImportListItem => ({
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
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
  ...overrides,
});

const makeIntake = (): RightsIntake =>
  ({
    id: 'intake-1',
    workflowStatus: 'HUMAN_REVIEW_REQUIRED',
    createdBookId: null,
  }) as unknown as RightsIntake;

describe('WP-G.9: предупреждение импорта не выглядит отказом', () => {
  beforeEach(() => {
    mocks.createImport.mockReset();
  });

  it('принятый импорт с предупреждениями прямо сообщает, что он принят', async () => {
    mocks.createImport.mockResolvedValue(makeDetail());

    importReport();

    await waitFor(() => {
      expect(screen.getByTestId('import-warnings-notice')).toBeInTheDocument();
    });
    expect(screen.getByTestId('import-warnings-notice').textContent).toMatch(/do not block/i);
    expect(screen.queryByTestId('import-rejected-notice')).not.toBeInTheDocument();
  });

  it('обратная сторона: отклонённый импорт сообщает об отказе', async () => {
    mocks.createImport.mockResolvedValue(
      makeDetail({
        importStatus: 'VALIDATION_FAILED',
        validationErrorsCount: 1,
        validationErrors: [
          { path: 'intakeId', message: 'intakeId mismatch', code: 'INTAKE_ID_MISMATCH' },
        ],
      })
    );

    importReport();

    await waitFor(() => {
      expect(screen.getByTestId('import-rejected-notice')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('import-warnings-notice')).not.toBeInTheDocument();
  });

  it('шаг таймлайна при предупреждениях не помечается как блокировка', () => {
    render(
      <WorkflowTimeline
        intake={makeIntake()}
        currentProfile={null}
        reviewImports={[makeListItem({ validationWarningsCount: 2 })]}
      />
    );

    const step = screen.getByTestId('timeline-step-3');
    expect(step.getAttribute('data-state')).not.toBe('blocked');
    expect(step.textContent).toMatch(/2 warning/i);
  });

  it('обратная сторона: провал валидации по-прежнему блокировка', () => {
    render(
      <WorkflowTimeline
        intake={makeIntake()}
        currentProfile={null}
        reviewImports={[
          makeListItem({ importStatus: 'VALIDATION_FAILED', validationErrorsCount: 3 }),
        ]}
      />
    );

    const step = screen.getByTestId('timeline-step-3');
    expect(step.getAttribute('data-state')).toBe('blocked');
  });
});
