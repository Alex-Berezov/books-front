import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  RightsFileCard,
  type RightsFileCardProps,
} from '@/components/admin/RightsIntakeDetail/RightsFileCard/RightsFileCard';
import { ApiError } from '@/types/api';
import type { RightsFileMeta } from '@/types/api-schema/rights-intake';

const NOTICE = 'Замена загруженного файла запрещена.';

const uploadedFile: RightsFileMeta = {
  sha256: 'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789',
  fileName: 'rights-report.pdf',
  contentType: 'application/pdf',
  sizeBytes: 2048,
  uploadedAt: '2026-08-01T10:00:00.000Z',
};

const renderCard = (
  overrides: Partial<RightsFileCardProps> = {},
  onUpload = vi.fn().mockResolvedValue(undefined),
  onDownload = vi.fn().mockResolvedValue(undefined)
) => {
  render(
    <RightsFileCard
      title="PDF-отчёт"
      replacementNotice={NOTICE}
      file={null}
      uploadLabel="Загрузить PDF"
      onUpload={onUpload}
      onDownload={onDownload}
      {...overrides}
    />
  );
  return { onUpload, onDownload };
};

// WP-9: юридический файл не имеет публичного URL, поэтому карточка — единственное место,
// где редактор видит его состояние и контрольную сумму.
describe('RightsFileCard (WP-9)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows the empty state with the upload control and the no-replacement notice', () => {
    renderCard({ maxSizeMb: 25, uploadWarning: 'Загрузка необратима.' });

    expect(screen.getByText('Не загружен')).toBeInTheDocument();
    expect(screen.getByText('Загрузка необратима.')).toBeInTheDocument();
    expect(screen.getByText(/Максимальный размер файла: 25 МБ/)).toBeInTheDocument();
    expect(screen.getByText(NOTICE)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Скачать файл/ })).not.toBeInTheDocument();
  });

  it('sends the picked file to the upload handler', async () => {
    const { onUpload } = renderCard();
    const file = new File(['%PDF-1.7'], 'report.pdf', { type: 'application/pdf' });

    await act(async () => {
      fireEvent.change(screen.getByLabelText(/Загрузить PDF/), { target: { files: [file] } });
    });

    expect(onUpload).toHaveBeenCalledTimes(1);
    expect(onUpload.mock.calls[0][0]).toBe(file);
  });

  it('shows name, size, date and a short checksum of an uploaded file', () => {
    renderCard({ file: uploadedFile });

    expect(screen.getByText('Загружен')).toBeInTheDocument();
    expect(screen.getByText('rights-report.pdf')).toBeInTheDocument();
    expect(screen.getByText('2 KB')).toBeInTheDocument();
    expect(screen.getByText('abcdef012345')).toBeInTheDocument();
    expect(screen.queryByLabelText(/Загрузить PDF/)).not.toBeInTheDocument();
  });

  it('downloads the file through the handler instead of a public link', async () => {
    const { onDownload } = renderCard({ file: uploadedFile });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Скачать файл/ }));
    });

    expect(onDownload).toHaveBeenCalledTimes(1);
  });

  it('translates a backend error code instead of showing the raw failure', async () => {
    const onUpload = vi.fn().mockRejectedValue(
      new ApiError({
        message: 'PDF-отчёт уже загружен.',
        statusCode: 400,
        data: { code: 'REPORT_PDF_ALREADY_UPLOADED' },
      })
    );
    renderCard({}, onUpload);

    await act(async () => {
      fireEvent.change(screen.getByLabelText(/Загрузить PDF/), {
        target: { files: [new File(['x'], 'report.pdf', { type: 'application/pdf' })] },
      });
    });

    expect(screen.getByRole('alert')).toHaveTextContent(
      'исправленный отчёт загружается новым импортом'
    );
  });
});
