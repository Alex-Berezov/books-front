'use client';

import type { FC } from 'react';
import { ShieldCheck, ShieldAlert, ShieldOff, RefreshCw } from 'lucide-react';
import {
  useVersionRightsContentHash,
  useCheckVersionRightsContentHash,
} from '@/api/hooks/useBookVersions';
import { Button } from '@/components/common/Button';
import styles from './RightsContentHashPanel.module.scss';

export interface RightsContentHashPanelProps {
  versionId: string;
}

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

      <div className={styles.actions}>
        <Button variant="secondary" size="sm" onClick={handleCheck} loading={isChecking}>
          Check rights content hash
        </Button>
      </div>
    </div>
  );
};
