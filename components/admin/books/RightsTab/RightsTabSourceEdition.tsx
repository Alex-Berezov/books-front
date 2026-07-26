'use client';

import type { FC } from 'react';
import { BookOpen, ExternalLink } from 'lucide-react';
import type { SourceEdition } from '@/types/api-schema/rights-intake';
import styles from './RightsTab.module.scss';

interface RightsTabSourceEditionProps {
  sourceEdition: SourceEdition | null;
}

export const RightsTabSourceEdition: FC<RightsTabSourceEditionProps> = ({ sourceEdition }) => {
  if (!sourceEdition) {
    return (
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <BookOpen size={18} />
          Source Edition & Legal Basis
        </h2>
        <p className={styles.mutedText}>
          No source edition record bound to this clearance profile.
        </p>
      </div>
    );
  }

  const { editionRights } = sourceEdition;

  return (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>
        <BookOpen size={18} />
        Source Edition & Legal Basis
      </h2>
      <div className={styles.detailsGrid}>
        <div className={styles.detailItem}>
          <span className={styles.detailLabel}>Provider</span>
          <span className={styles.detailValue}>{sourceEdition.provider}</span>
        </div>
        <div className={styles.detailItem}>
          <span className={styles.detailLabel}>External ID</span>
          <span className={styles.detailValue}>{sourceEdition.externalId || '—'}</span>
        </div>
        <div className={styles.detailItem}>
          <span className={styles.detailLabel}>Source Title</span>
          <span className={styles.detailValue}>{sourceEdition.sourceTitle || '—'}</span>
        </div>
        <div className={styles.detailItem}>
          <span className={styles.detailLabel}>Language / Text Type</span>
          <span className={styles.detailValue}>
            {sourceEdition.sourceLanguage?.toUpperCase() || '—'} / {sourceEdition.sourceTextType}
          </span>
        </div>
        <div className={styles.detailItem}>
          <span className={styles.detailLabel}>Gutenberg Status</span>
          <span className={styles.detailValue}>{sourceEdition.gutenbergStatus || '—'}</span>
        </div>
        <div className={styles.detailItem}>
          <span className={styles.detailLabel}>Edition Status</span>
          <span className={styles.detailValue}>
            <span className={styles.badge} data-status="APPROVED">
              {sourceEdition.status}
            </span>
          </span>
        </div>
      </div>

      {sourceEdition.sourceUrl && (
        <div className={styles.sourceUrlRow}>
          <a
            href={sourceEdition.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.externalLink}
          >
            Open Source Catalog Entry <ExternalLink size={14} />
          </a>
        </div>
      )}

      {editionRights && (
        <div className={styles.subSection}>
          <h3 className={styles.subSectionTitle}>Edition Rights & Legal Ground</h3>
          <div className={styles.detailsGrid}>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Rights Status</span>
              <span className={styles.detailValue}>
                <span className={styles.badge} data-status="APPROVED">
                  {editionRights.status}
                </span>
              </span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Legal Basis</span>
              <span className={styles.detailValue}>{editionRights.legalBasisRu || '—'}</span>
            </div>
          </div>
          {editionRights.notesRu && (
            <p className={styles.notesText}>
              <strong>Legal Notes:</strong> {editionRights.notesRu}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
