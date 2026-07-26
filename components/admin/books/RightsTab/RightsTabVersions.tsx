'use client';

import type { FC } from 'react';
import { Globe, AlertCircle, ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { BookRightsDashboardVersionSummary } from '@/types/api-schema/book-rights';
import styles from './RightsTab.module.scss';

interface RightsTabVersionsProps {
  versions: BookRightsDashboardVersionSummary[];
  currentVersionId: string;
  lang: SupportedLang;
}

export const RightsTabVersions: FC<RightsTabVersionsProps> = ({
  versions,
  currentVersionId,
  lang,
}) => {
  if (!versions || versions.length === 0) {
    return null;
  }

  return (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>
        <Globe size={18} />
        Language Editions ({versions.length})
      </h2>
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Language</th>
              <th>Title</th>
              <th>Status</th>
              <th>Geo-block</th>
              <th>Stale / Hash</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {versions.map((v) => {
              const isCurrent = v.id === currentVersionId;
              return (
                <tr key={v.id} className={isCurrent ? styles.activeRow : ''}>
                  <td>
                    <strong>{v.language.toUpperCase()}</strong> {isCurrent && '(current)'}
                  </td>
                  <td>{v.title || 'Untitled'}</td>
                  <td>
                    <span className={styles.badge} data-status={v.status.toUpperCase()}>
                      {v.status}
                    </span>
                  </td>
                  <td>
                    {v.rightsGeoBlockRequired ? (
                      v.rightsGeoBlockConfigured ? (
                        <span className={styles.badge} data-status="APPROVED">
                          Configured
                        </span>
                      ) : (
                        <span className={styles.badge} data-status="REJECTED">
                          <ShieldAlert size={12} />
                          Missing Config
                        </span>
                      )
                    ) : (
                      <span className={styles.mutedText}>Not required</span>
                    )}
                  </td>
                  <td>
                    {v.rightsStaleDetectedAt ? (
                      <span className={styles.badge} data-status="STALE">
                        <AlertCircle size={12} />
                        Stale ({v.rightsStaleReasonCode || 'mismatch'})
                      </span>
                    ) : v.rightsRecheckRequired ? (
                      <span className={styles.badge} data-status="MEDIUM">
                        Recheck Needed
                      </span>
                    ) : (
                      <span className={styles.badge} data-status="APPROVED">
                        Fresh
                      </span>
                    )}
                  </td>
                  <td>
                    {!isCurrent ? (
                      <Link
                        href={`/admin/${lang}/books/versions/${v.id}`}
                        className={styles.linkAction}
                      >
                        Edit Version
                      </Link>
                    ) : (
                      <span className={styles.mutedText}>Editing</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
