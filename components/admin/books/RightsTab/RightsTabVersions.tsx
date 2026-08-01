'use client';

import type { FC } from 'react';
import { Globe, AlertCircle, ShieldAlert, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { BookRightsDashboardVersionSummary } from '@/types/api-schema/book-rights';
import type { EditionRights } from '@/types/api-schema/rights-intake';
import styles from './RightsTab.module.scss';
import { INTERMEDIATE_TRANSLATION_ORIGIN, TRANSLATION_ORIGIN_LABELS } from './translationOrigin';

interface RightsTabVersionsProps {
  versions: BookRightsDashboardVersionSummary[];
  currentVersionId: string;
  lang: SupportedLang;
  /** WP-7.4: правовой срез по языкам действующего клиренса. */
  editionRights?: EditionRights[];
}

export const RightsTabVersions: FC<RightsTabVersionsProps> = ({
  versions,
  currentVersionId,
  lang,
  editionRights = [],
}) => {
  if (!versions || versions.length === 0) {
    return null;
  }

  const rightsByLanguage = new Map(
    editionRights.map((record) => [record.languageCode.toLowerCase(), record])
  );

  const intermediateLanguages = editionRights
    .filter((record) => record.translationOrigin === INTERMEDIATE_TRANSLATION_ORIGIN)
    .map((record) => record.languageCode.toUpperCase());

  return (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>
        <Globe size={18} />
        Language Editions ({versions.length})
      </h2>

      {intermediateLanguages.length > 0 && (
        <p className={styles.languageWarning}>
          <AlertTriangle size={16} />
          <span>
            Перевод через промежуточный язык ({intermediateLanguages.join(', ')}): права нужно
            проверять и на исходный текст, и на промежуточный перевод.
          </span>
        </p>
      )}

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Language</th>
              <th>Title</th>
              <th>Rights</th>
              <th>Translation</th>
              <th>Status</th>
              <th>Geo-block</th>
              <th>Stale / Hash</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {versions.map((v) => {
              const isCurrent = v.id === currentVersionId;
              const languageRights = rightsByLanguage.get(v.language.toLowerCase());
              return (
                <tr key={v.id} className={isCurrent ? styles.activeRow : ''}>
                  <td>
                    <strong>{v.language.toUpperCase()}</strong> {isCurrent && '(current)'}
                  </td>
                  <td>{v.title || 'Untitled'}</td>
                  <td>
                    {languageRights ? (
                      <span className={styles.badge} data-status={languageRights.status}>
                        {languageRights.status}
                      </span>
                    ) : (
                      <span className={styles.mutedText}>Не оценён</span>
                    )}
                  </td>
                  <td>
                    {languageRights ? (
                      <span className={styles.translationCell}>
                        <span>
                          {TRANSLATION_ORIGIN_LABELS[languageRights.translationOrigin] ||
                            languageRights.translationOrigin}
                        </span>
                        {languageRights.translationSourceLanguage && (
                          <span className={styles.translationVia}>
                            исходник: {languageRights.translationSourceLanguage.toUpperCase()}
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className={styles.mutedText}>—</span>
                    )}
                  </td>
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
