'use client';

import { useState, type ChangeEvent, type FC } from 'react';
import { Download, FileUp } from 'lucide-react';
import { formatDateTime, formatFileSize } from '@/lib/admin/formatters';
import type { RightsFileMeta } from '@/types/api-schema/rights-intake';
import styles from './RightsFileCard.module.scss';
import { getRightsFileErrorMessage } from '../rightsFileErrors';

/** How much of the checksum is readable at a glance; the full value stays in the title attribute. */
const SHA_PREVIEW_LENGTH = 12;

const ICON_SIZE = 14;

export interface RightsFileCardProps {
  /** Human title of the slot, e.g. "PDF-отчёт". */
  title: string;
  /** What the file is for and who may read it. */
  hint?: string;
  /** Read before uploading: irreversibility, clearance re-check, and so on. */
  uploadWarning?: string;
  /** Always visible: replacing an uploaded file is forbidden on every path. */
  replacementNotice: string;
  /** `accept` for the file input. */
  accept?: string;
  /** Server-side upload limit, megabytes. */
  maxSizeMb?: number | null;
  /** Metadata of the stored file; `null` — nothing uploaded yet. */
  file: RightsFileMeta | null;
  uploadLabel?: string;
  disabled?: boolean;
  onUpload: (file: File) => Promise<void>;
  onDownload: () => Promise<void>;
}

/**
 * WP-9 — карточка приватного юридического файла.
 *
 * Одна и та же карточка обслуживает три пути (PDF-отчёт, файл источника, архивная копия
 * доказательства): у всех трёх одинаковые правила — сумму считает сервер, публичной ссылки нет,
 * замена запрещена. Поэтому и состояние показывается одинаково: загружен / не загружен, имя,
 * размер, дата и короткая контрольная сумма.
 */
export const RightsFileCard: FC<RightsFileCardProps> = (props) => {
  const {
    title,
    hint,
    uploadWarning,
    replacementNotice,
    accept,
    maxSizeMb,
    file,
    uploadLabel = 'Загрузить файл',
    disabled = false,
    onUpload,
    onDownload,
  } = props;

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const shortSha = file?.sha256 ? file.sha256.slice(0, SHA_PREVIEW_LENGTH) : '—';

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0];
    event.target.value = '';
    if (!selected) return;

    setError(null);
    setBusy(true);
    try {
      await onUpload(selected);
    } catch (uploadError) {
      setError(getRightsFileErrorMessage(uploadError));
    } finally {
      setBusy(false);
    }
  };

  const handleDownload = async () => {
    setError(null);
    setBusy(true);
    try {
      await onDownload();
    } catch (downloadError) {
      setError(getRightsFileErrorMessage(downloadError));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.title}>{title}</span>
        <span className={styles.status} data-uploaded={file ? 'yes' : 'no'}>
          {file ? 'Загружен' : 'Не загружен'}
        </span>
      </div>

      {hint && <p className={styles.hint}>{hint}</p>}

      {file ? (
        <>
          <dl className={styles.meta}>
            <div className={styles.metaRow}>
              <dt className={styles.metaLabel}>Файл</dt>
              <dd className={styles.metaValue}>{file.fileName || '—'}</dd>
            </div>
            <div className={styles.metaRow}>
              <dt className={styles.metaLabel}>Размер</dt>
              <dd className={styles.metaValue}>
                {typeof file.sizeBytes === 'number' ? formatFileSize(file.sizeBytes) : '—'}
              </dd>
            </div>
            <div className={styles.metaRow}>
              <dt className={styles.metaLabel}>Дата загрузки</dt>
              <dd className={styles.metaValue}>
                {file.uploadedAt ? formatDateTime(file.uploadedAt, 'ru') : '—'}
              </dd>
            </div>
            <div className={styles.metaRow}>
              <dt className={styles.metaLabel}>SHA-256</dt>
              <dd className={styles.sha} title={file.sha256 ?? undefined}>
                {shortSha}
              </dd>
            </div>
          </dl>

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.downloadBtn}
              onClick={() => void handleDownload()}
              disabled={busy || disabled}
            >
              <Download size={ICON_SIZE} />
              {busy ? 'Скачивание…' : 'Скачать файл'}
            </button>
          </div>
        </>
      ) : (
        <>
          {uploadWarning && <p className={styles.warning}>{uploadWarning}</p>}
          <label className={styles.uploadLabel} data-disabled={busy || disabled ? 'yes' : 'no'}>
            <FileUp size={ICON_SIZE} />
            {busy ? 'Загрузка…' : uploadLabel}
            <input
              type="file"
              className={styles.fileInput}
              accept={accept}
              disabled={busy || disabled}
              onChange={(event) => void handleFileChange(event)}
            />
          </label>
          {typeof maxSizeMb === 'number' && (
            <p className={styles.limit}>Максимальный размер файла: {maxSizeMb} МБ.</p>
          )}
        </>
      )}

      <p className={styles.notice}>{replacementNotice}</p>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
};
