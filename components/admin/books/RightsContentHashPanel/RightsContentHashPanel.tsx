'use client';

import type { FC } from 'react';
import { useState, useCallback } from 'react';
import { ShieldCheck, ShieldAlert, ShieldOff, RefreshCw, Copy, Check } from 'lucide-react';
import {
  useVersionRightsContentHash,
  useCheckVersionRightsContentHash,
} from '@/api/hooks/useBookVersions';
import { Button } from '@/components/common/Button';
import styles from './RightsContentHashPanel.module.scss';

export interface RightsContentHashPanelProps {
  versionId: string;
}

function truncateHash(hash: string): string {
  return hash.length > 20 ? `${hash.slice(0, 10)}...${hash.slice(-6)}` : hash;
}

interface CopyButtonProps {
  text: string;
}

const CopyButton: FC<CopyButtonProps> = ({ text }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [text]);

  return (
    <button type="button" className={styles.copyButton} onClick={handleCopy} title="Copy full hash">
      {copied ? <Check size={12} /> : <Copy size={12} />}
    </button>
  );
};

export const RightsContentHashPanel: FC<RightsContentHashPanelProps> = ({ versionId }) => {
  const { data, isLoading, isError } = useVersionRightsContentHash(versionId);
  const checkMutation = useCheckVersionRightsContentHash();

  const handleCheck = () => {
    checkMutation.mutate(versionId);
  };

  const isChecking = isLoading || checkMutation.isPending;

  if (isLoading) {
    return (
      <div className={styles.panel}>
        <div className={styles.header}>
          <RefreshCw className={styles.icon} size={18} />
          <span className={styles.title}>Rights Content Hash</span>
        </div>
        <p className={styles.loadingText}>Checking content hash...</p>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className={styles.panel}>
        <div className={styles.header}>
          <ShieldOff className={styles.iconError} size={18} />
          <span className={styles.title}>Rights Content Hash</span>
        </div>
        <p className={styles.errorText}>Failed to check content hash</p>
        <Button variant="secondary" size="sm" onClick={handleCheck} loading={isChecking}>
          Retry
        </Button>
      </div>
    );
  }

  let icon = <ShieldCheck className={styles.iconOk} size={18} />;
  let statusText = 'Rights content hash актуален';
  let statusClass = styles.statusOk;

  if (!data.baselineHash) {
    icon = <ShieldOff className={styles.iconMissing} size={18} />;
    statusText = 'Content hash не создан';
    statusClass = styles.statusMissing;
  } else if (data.isStale || data.recheckRequired) {
    icon = <ShieldAlert className={styles.iconStale} size={18} />;
    statusText = 'Требуется повторная проверка прав';
    statusClass = styles.statusStale;
  }

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        {icon}
        <span className={styles.title}>Rights Content Hash</span>
      </div>

      <div className={`${styles.statusBadge} ${statusClass}`}>{statusText}</div>

      {data.reasonRu && <p className={styles.reason}>{data.reasonRu}</p>}

      <div className={styles.details}>
        {data.baselineHash && (
          <div className={styles.hashRow}>
            <span className={styles.hashLabel}>Stored hash:</span>
            <span className={styles.hashValue}>{truncateHash(data.baselineHash)}</span>
            <CopyButton text={data.baselineHash} />
          </div>
        )}
        <div className={styles.hashRow}>
          <span className={styles.hashLabel}>Current hash:</span>
          <span className={styles.hashValue}>{truncateHash(data.currentHash)}</span>
          <CopyButton text={data.currentHash} />
        </div>
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>Algorithm:</span>
          <span className={styles.detailValue}>{data.algorithmVersion}</span>
        </div>
        {data.checkedAt && (
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Checked at:</span>
            <span className={styles.detailValue}>{new Date(data.checkedAt).toLocaleString()}</span>
          </div>
        )}
      </div>

      <div className={styles.actions}>
        <Button variant="secondary" size="sm" onClick={handleCheck} loading={isChecking}>
          Check rights content hash
        </Button>
      </div>
    </div>
  );
};
