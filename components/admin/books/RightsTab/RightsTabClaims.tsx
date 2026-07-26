'use client';

import type { FC } from 'react';
import { ShieldCheck } from 'lucide-react';
import styles from './RightsTab.module.scss';

export const RightsTabClaims: FC = () => {
  return (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>
        <ShieldCheck size={18} />
        Copyright Claims & DMCA Notices
      </h2>
      <div className={styles.claimsCard}>
        <span className={styles.badge} data-status="APPROVED">
          No Active Claims
        </span>
        <p className={styles.mutedText}>
          No copyright disputes, DMCA takedown requests, or third-party rights claims are currently
          recorded for this edition.
          <br />
          <small>
            (Rights claims management & automated takedown workflow is planned for Phase 16)
          </small>
        </p>
      </div>
    </div>
  );
};
