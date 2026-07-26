'use client';

import type { FC } from 'react';
import { ShieldAlert, Plus, List } from 'lucide-react';
import Link from 'next/link';
import type { SupportedLang } from '@/lib/i18n/lang';
import styles from './RightsTab.module.scss';

interface RightsTabEmptyStateProps {
  lang: SupportedLang;
}

export const RightsTabEmptyState: FC<RightsTabEmptyStateProps> = ({ lang }) => {
  return (
    <div className={styles.emptyState}>
      <ShieldAlert size={48} className={styles.emptyIcon} />
      <h3 className={styles.emptyTitle}>No Rights Clearance Linked</h3>
      <p className={styles.emptyDesc}>
        This book edition has no associated <strong>Rights Intake</strong> or copyright clearance
        workflow. Legacy books or manually created records require an approved clearance before
        publication.
      </p>
      <div className={styles.summaryBadges}>
        <Link href={`/admin/${lang}/rights-intakes`} className={styles.intakeLinkBtn}>
          <List size={16} />
          Browse Rights Intakes
        </Link>
        <Link href={`/admin/${lang}/rights-intakes/new`} className={styles.intakeLinkBtn}>
          <Plus size={16} />
          Create Rights Intake
        </Link>
      </div>
    </div>
  );
};
