'use client';

import { useState, type FC } from 'react';
import { downloadRightsEvidenceArchiveCopy } from '@/api/endpoints/admin/rights-files';
import {
  useRightsFileLimits,
  useSupersedeRightsEvidence,
  useUploadRightsEvidenceArchiveCopy,
} from '@/api/hooks/useRightsFiles';
import type { RightsEvidence, RightsFileMeta } from '@/types/api-schema/rights-intake';
import styles from './EvidencePanel.module.scss';
import { RightsFileCard } from '../RightsFileCard/RightsFileCard';
import { getRightsFileErrorMessage } from '../rightsFileErrors';

export interface EvidencePanelProps {
  evidence: RightsEvidence[];
}

const ARCHIVE_HINT =
  'Копия документа на нашей стороне. Внешний адрес завтра может отдать 404 вместе с ' +
  'обоснованием блокировки страны — копию загружает редактор, сервер по внешним ссылкам не ходит.';

const ARCHIVE_REPLACEMENT_NOTICE =
  'Замена архивной копии запрещена. Если документ изменился, заведите новое доказательство и ' +
  'пометьте им прежнее как заменённое — удалять доказательства нельзя.';

const toFileMeta = (item: RightsEvidence): RightsFileMeta | null =>
  item.isArchivedCopy
    ? {
        sha256: item.fileSha256 ?? null,
        fileName: item.fileName ?? null,
        contentType: item.contentType ?? null,
        sizeBytes: item.sizeBytes ?? null,
        uploadedAt: item.archivedAt ?? null,
      }
    : null;

/**
 * WP-9.3 — доказательства с архивными копиями и цепочкой замен.
 *
 * Доказательство хранилось одним URL и не имело способа устареть: удалить его нельзя (ADR-009),
 * а «оно больше не действует» выражается только ссылкой на преемника.
 */
export const EvidencePanel: FC<EvidencePanelProps> = ({ evidence }) => {
  const [successorIds, setSuccessorIds] = useState<Record<string, string>>({});
  const [supersedeError, setSupersedeError] = useState<string | null>(null);

  const { data: limits } = useRightsFileLimits();
  const uploadMutation = useUploadRightsEvidenceArchiveCopy();
  const supersedeMutation = useSupersedeRightsEvidence();

  if (evidence.length === 0) {
    return <p className={styles.empty}>Доказательств нет.</p>;
  }

  const titleById = new Map(evidence.map((item) => [item.id, item.title]));
  const accept = limits?.allowedContentTypes.evidence.join(',');

  const handleSupersede = async (evidenceId: string) => {
    const supersededById = successorIds[evidenceId];
    if (!supersededById) return;

    setSupersedeError(null);
    try {
      await supersedeMutation.mutateAsync({ evidenceId, supersededById });
      setSuccessorIds((prev) => ({ ...prev, [evidenceId]: '' }));
    } catch (error) {
      setSupersedeError(getRightsFileErrorMessage(error));
    }
  };

  return (
    <div className={styles.list}>
      {evidence.map((item) => {
        const isSuperseded = item.isCurrent === false;
        const candidates = evidence.filter((other) => other.id !== item.id);

        return (
          <div key={item.id} className={styles.item} data-superseded={isSuperseded ? 'yes' : 'no'}>
            <div className={styles.header}>
              <span>{item.evidenceType}</span>
              <span>{item.sourceLevel}</span>
            </div>

            <div className={styles.badges}>
              {item.isArchivedCopy && (
                <span className={styles.badge} data-tone="archived">
                  Архивная копия есть
                </span>
              )}
              {isSuperseded && (
                <span className={styles.badge} data-tone="superseded">
                  Заменено
                </span>
              )}
            </div>

            <p className={styles.title}>{item.title}</p>
            <p className={styles.authority}>{item.authority}</p>
            {item.summaryRu && <p className={styles.authority}>{item.summaryRu}</p>}
            {item.url && (
              <a href={item.url} target="_blank" rel="noopener noreferrer" className={styles.url}>
                {item.url}
              </a>
            )}

            {isSuperseded && item.supersededById && (
              <p className={styles.replacedBy}>
                Заменено доказательством:{' '}
                {titleById.get(item.supersededById) ?? item.supersededById}
              </p>
            )}

            <RightsFileCard
              title="Архивная копия документа"
              hint={ARCHIVE_HINT}
              replacementNotice={ARCHIVE_REPLACEMENT_NOTICE}
              accept={accept}
              maxSizeMb={limits?.maxSizeMb ?? null}
              file={toFileMeta(item)}
              uploadLabel="Загрузить архивную копию"
              onUpload={async (selected) => {
                await uploadMutation.mutateAsync({ evidenceId: item.id, file: selected });
              }}
              onDownload={() => downloadRightsEvidenceArchiveCopy(item.id)}
            />

            {!isSuperseded && candidates.length > 0 && (
              <div className={styles.supersedeRow}>
                <label className={styles.supersedeLabel} htmlFor={`supersede-${item.id}`}>
                  Заменено доказательством
                </label>
                <select
                  id={`supersede-${item.id}`}
                  className={styles.supersedeSelect}
                  value={successorIds[item.id] ?? ''}
                  onChange={(event) =>
                    setSuccessorIds((prev) => ({ ...prev, [item.id]: event.target.value }))
                  }
                >
                  <option value="">Не выбрано</option>
                  {candidates.map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>
                      {candidate.title}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className={styles.supersedeBtn}
                  disabled={!successorIds[item.id] || supersedeMutation.isPending}
                  onClick={() => void handleSupersede(item.id)}
                >
                  Пометить заменённым
                </button>
              </div>
            )}
          </div>
        );
      })}

      {supersedeError && (
        <p className={styles.error} role="alert">
          {supersedeError}
        </p>
      )}
    </div>
  );
};
