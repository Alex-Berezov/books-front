'use client';

import { useState, useCallback, type FC } from 'react';
import { Eye, Copy, FileDown, X } from 'lucide-react';
import { useRightsAgentManifest } from '@/api/hooks/useRightsIntakes';
import type { RightsAgentManifest } from '@/types/api-schema/rights-intake';
import styles from './ManifestPanel.module.scss';

interface ManifestPanelProps {
  intakeId: string;
  workflowStatus: string;
}

export const ManifestPanel: FC<ManifestPanelProps> = ({ intakeId, workflowStatus }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [manifestData, setManifestData] = useState<RightsAgentManifest | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  const manifestQuery = useRightsAgentManifest(intakeId);

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

  const isDisabled = workflowStatus === 'DRAFT';

  return (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>Agent Manifest</h2>
      {isDisabled ? (
        <>
          <p className={styles.manifestHint}>
            Mark this intake as <strong>Ready For Agent</strong> before exporting the agent
            manifest.
          </p>
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
