'use client';

import { useState, useCallback, type FC } from 'react';
import { Eye, Copy, FileDown, X, Send } from 'lucide-react';
import { useRightsAgentManifest, useRightsIntakeReadiness } from '@/api/hooks/useRightsIntakes';
import type { RightsAgentManifest } from '@/types/api-schema/rights-intake';
import styles from './ManifestPanel.module.scss';

interface ManifestPanelProps {
  intakeId: string;
  workflowStatus: string;
  /**
   * WP-M.2: перевод интейка в `READY_FOR_AGENT` прямо отсюда. Кнопка была только в шапке
   * страницы, а неактивные кнопки выгрузки — здесь, рядом со списком пробелов интейка.
   * Редактор читал это как «заполни пробелы, тогда разблокируется», дозаполнял поля
   * (в бою — строкой «null» во внешнем ID) и всё равно упирался в неактивные кнопки.
   */
  onMarkReady?: () => void;
  isMarkingReady?: boolean;
  markReadyError?: string | null;
}

/**
 * WP-10.3 (R4-06): белый список статусов, при которых манифест выгружается. ТЗ фазы 2
 * разрешает выгрузку только в READY_FOR_AGENT; чёрный список из одного DRAFT оставлял
 * кнопки активными для шести прочих статусов и упирал редактора в 400 бэкенда.
 */
const MANIFEST_EXPORTABLE_STATUSES: readonly string[] = ['READY_FOR_AGENT'];

export const ManifestPanel: FC<ManifestPanelProps> = ({
  intakeId,
  workflowStatus,
  onMarkReady,
  isMarkingReady = false,
  markReadyError = null,
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [manifestData, setManifestData] = useState<RightsAgentManifest | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  const manifestQuery = useRightsAgentManifest(intakeId);
  const readinessQuery = useRightsIntakeReadiness(intakeId);

  const fetchManifest = useCallback(async (): Promise<RightsAgentManifest | null> => {
    setErrorMsg(null);
    try {
      const result = await manifestQuery.refetch();
      if (result.error) {
        const msg =
          result.error instanceof Error ? result.error.message : 'Failed to load agent manifest';
        setErrorMsg(msg);
        return null;
      }
      return result.data ?? null;
    } catch {
      setErrorMsg('Failed to load agent manifest');
      return null;
    }
  }, [manifestQuery]);

  const handlePreview = async () => {
    const data = await fetchManifest();
    if (data) {
      setManifestData(data);
      setModalOpen(true);
    }
  };

  const handleCopy = async () => {
    const data = await fetchManifest();
    if (!data) return;

    try {
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      setCopyStatus('Copied!');
      setTimeout(() => setCopyStatus(null), 2000);
    } catch {
      setCopyStatus('Clipboard unavailable');
      setTimeout(() => setCopyStatus(null), 3000);
    }
  };

  const handleDownload = async () => {
    const data = await fetchManifest();
    if (!data) return;

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bibliaris-rights-manifest-${intakeId}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const canExport = MANIFEST_EXPORTABLE_STATUSES.includes(workflowStatus);

  // WP-F.5: пробелы интейка — подсказка, а не запрет. Кнопки выгрузки от них не зависят:
  // блокирующая проверка сделала бы вход в систему строже, а не мягче.
  const readiness = readinessQuery.data;
  const readinessGaps = [...(readiness?.missing ?? []), ...(readiness?.warnings ?? [])];

  const isDraft = workflowStatus === 'DRAFT';

  return (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>Agent Manifest</h2>
      {/*
        WP-M.2: причина, по которой кнопки неактивны, идёт первой — до списка пробелов.
        В обратном порядке два независимых блока читались как один: сначала «чего не хватает»,
        потом серые кнопки, и получалось «кнопки заблокированы пробелами». Пробелы выгрузку
        не блокируют вовсе, блокирует только статус.
      */}
      {!canExport && (
        <div className={styles.gate}>
          <p className={styles.manifestHint}>
            {isDraft ? (
              <>
                This intake is still a <strong>draft</strong>. The agent manifest is generated for
                intakes marked <strong>Ready For Agent</strong> — the gaps listed below do not block
                it.
              </>
            ) : (
              'Manifest export is available only for intakes in Ready For Agent status.'
            )}
          </p>
          {isDraft && onMarkReady && (
            <button
              className={styles.actionBtnPrimary}
              onClick={onMarkReady}
              disabled={isMarkingReady}
            >
              <Send size={16} />
              {isMarkingReady ? 'Updating...' : 'Mark Ready For Agent'}
            </button>
          )}
          {markReadyError && <p className={styles.manifestErrorText}>{markReadyError}</p>}
        </div>
      )}
      {readinessGaps.length > 0 && (
        <div className={styles.readiness}>
          <p className={styles.readinessTitle}>
            Intake data gaps — the agent will work without them, but the answer will be weaker:
          </p>
          <ul className={styles.readinessList}>
            {readinessGaps.map((gap) => (
              <li key={gap.code} className={styles.readinessItem}>
                {gap.messageRu}
              </li>
            ))}
          </ul>
        </div>
      )}
      {!canExport ? (
        <>
          <div className={styles.manifestActions}>
            <button className={styles.actionBtnSecondary} disabled>
              <Eye size={16} />
              Preview Manifest
            </button>
            <button className={styles.actionBtnSecondary} disabled>
              <Copy size={16} />
              Copy JSON
            </button>
            <button className={styles.actionBtnSecondary} disabled>
              <FileDown size={16} />
              Download JSON
            </button>
          </div>
        </>
      ) : (
        <>
          <p className={styles.manifestHint}>
            Export a structured JSON manifest for the external ChatGPT-based rights check agent.
          </p>
          <div className={styles.manifestActions}>
            <button
              className={styles.actionBtnSecondary}
              onClick={handlePreview}
              disabled={manifestQuery.isFetching}
            >
              <Eye size={16} />
              Preview Manifest
            </button>
            <button
              className={styles.actionBtnSecondary}
              onClick={handleCopy}
              disabled={manifestQuery.isFetching}
            >
              <Copy size={16} />
              {copyStatus || 'Copy JSON'}
            </button>
            <button
              className={styles.actionBtnSecondary}
              onClick={handleDownload}
              disabled={manifestQuery.isFetching}
            >
              <FileDown size={16} />
              Download JSON
            </button>
          </div>
          {errorMsg && <p className={styles.manifestErrorText}>{errorMsg}</p>}
        </>
      )}

      {modalOpen && manifestData && (
        <div
          className={styles.overlay}
          onClick={() => setModalOpen(false)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setModalOpen(false);
          }}
          role="button"
          tabIndex={0}
        >
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Agent Manifest Preview</h3>
              <button className={styles.modalClose} onClick={() => setModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <pre className={styles.modalBody}>{JSON.stringify(manifestData, null, 2)}</pre>
          </div>
        </div>
      )}
    </div>
  );
};
