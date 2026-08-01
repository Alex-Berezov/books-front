'use client';

import type { FC } from 'react';
import { downloadRightsReportPdf } from '@/api/endpoints/admin/rights-files';
import { useRightsFileLimits, useUploadRightsReportPdf } from '@/api/hooks/useRightsFiles';
import { useRightsReviewImportDetail } from '@/api/hooks/useRightsIntakes';
import type { RightsFileMeta } from '@/types/api-schema/rights-intake';
import styles from './ReportPdfPanel.module.scss';
import { RightsFileCard } from '../RightsFileCard/RightsFileCard';

export interface ReportPdfPanelProps {
  /** Текущий импорт отчёта; `null` — импортов ещё нет. */
  importId: string | null;
}

const REPLACEMENT_NOTICE =
  'Замена загруженного PDF запрещена. Если отчёт исправлен, загрузите его новым импортом — ' +
  'новый импорт вытеснит текущий, а прежний PDF останется в архиве вместе со своим импортом.';

const HINT =
  'PDF-версия отчёта агента. Файл приватный: публичной ссылки у него нет, скачать его могут ' +
  'только Admin и Content Manager. Контрольную сумму считает сервер.';

const UPLOAD_WARNING =
  'Загрузка необратима: перезаписать этот файл потом будет нельзя. Убедитесь, что выбран ' +
  'итоговый PDF того же отчёта, который импортирован в JSON.';

/**
 * WP-9.2 — PDF-версия отчёта о правах.
 *
 * В отличие от .json и .md, которые панель импорта читает `FileReader`'ом и отправляет текстом,
 * PDF уходит на сервер настоящим multipart-запросом: это бинарный юридический артефакт, его
 * сумму считает сервер, а хранится он вне публичного хранилища.
 */
export const ReportPdfPanel: FC<ReportPdfPanelProps> = ({ importId }) => {
  const { data: detail, isLoading } = useRightsReviewImportDetail(importId ?? '');
  const { data: limits } = useRightsFileLimits();
  const uploadMutation = useUploadRightsReportPdf();

  if (!importId) {
    return (
      <div className={styles.block}>
        <h3 className={styles.blockTitle}>PDF-версия отчёта</h3>
        <p className={styles.hint}>
          PDF прикрепляется к импорту отчёта. Сначала импортируйте JSON-отчёт агента.
        </p>
      </div>
    );
  }

  const file: RightsFileMeta | null = detail?.hasReportPdf
    ? {
        sha256: detail.reportPdfSha256 ?? null,
        fileName: detail.reportPdfFileName ?? null,
        contentType: detail.reportPdfContentType ?? null,
        sizeBytes: detail.reportPdfSizeBytes ?? null,
        uploadedAt: detail.reportPdfUploadedAt ?? null,
      }
    : null;

  const provenance = [
    detail?.agentModel ? `модель: ${detail.agentModel}` : null,
    detail?.promptVersion ? `промпт: ${detail.promptVersion}` : null,
    detail?.inputManifestVersion ? `манифест: ${detail.inputManifestVersion}` : null,
    detail?.inputManifestSha256 ? `sha входа: ${detail.inputManifestSha256.slice(0, 12)}` : null,
  ].filter((part): part is string => part !== null);

  const handleUpload = async (selected: File) => {
    await uploadMutation.mutateAsync({ importId, file: selected });
  };

  return (
    <div className={styles.block}>
      <h3 className={styles.blockTitle}>PDF-версия отчёта</h3>

      {isLoading && !detail ? (
        <p className={styles.hint}>Загрузка данных импорта…</p>
      ) : (
        <>
          <RightsFileCard
            title="PDF-отчёт"
            hint={HINT}
            uploadWarning={UPLOAD_WARNING}
            replacementNotice={REPLACEMENT_NOTICE}
            accept="application/pdf,.pdf"
            maxSizeMb={limits?.maxSizeMb ?? null}
            file={file}
            uploadLabel="Загрузить PDF"
            onUpload={handleUpload}
            onDownload={() => downloadRightsReportPdf(importId)}
          />
          {provenance.length > 0 && (
            <p className={styles.provenance}>Происхождение отчёта — {provenance.join(', ')}.</p>
          )}
        </>
      )}
    </div>
  );
};
