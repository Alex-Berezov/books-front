'use client';

import type { FC } from 'react';
import { BookOpen, ExternalLink } from 'lucide-react';
import type { SourceEdition } from '@/types/api-schema/rights-intake';
import styles from './RightsTab.module.scss';
import { TRANSLATION_ORIGIN_LABELS } from './translationOrigin';

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

  // WP-7.1: до выката пакета бэкенд отдавал здесь один объект или null — не даём упасть
  // вкладке, если фронт оказался новее сервера.
  const editionRights = Array.isArray(sourceEdition.editionRights)
    ? sourceEdition.editionRights
    : [];

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
            {/* WP-10.8 (R7-02): цвет считается из фактического статуса. Литерал "APPROVED"
                красил COPYRIGHTED и UNCERTAIN зелёным «одобрено». */}
            <span className={styles.badge} data-status={sourceEdition.status}>
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

      {/*
        WP-7.1: права издания — запись на язык. Раньше здесь показывалась одна строка,
        дословно повторявшая статус и заметку исходного издания (R7-02).
      */}
      <div className={styles.subSection}>
        <h3 className={styles.subSectionTitle}>Language Rights & Legal Ground</h3>
        {editionRights.length === 0 ? (
          <p className={styles.mutedText}>
            Языковой срез прав ещё не материализован. Он появится после импорта отчёта, в котором
            есть блок оценок по языкам.
          </p>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Language</th>
                  <th>Rights Status</th>
                  <th>Translation Origin</th>
                  <th>Translated From</th>
                  <th>Geo-block</th>
                  <th>Legal Basis / Notes</th>
                </tr>
              </thead>
              <tbody>
                {editionRights.map((record) => (
                  <tr key={record.id}>
                    <td>
                      <strong>{record.languageCode.toUpperCase()}</strong>
                    </td>
                    <td>
                      <span className={styles.badge} data-status={record.status}>
                        {record.status}
                      </span>
                    </td>
                    <td>
                      {TRANSLATION_ORIGIN_LABELS[record.translationOrigin] ||
                        record.translationOrigin}
                    </td>
                    <td>
                      {record.translationSourceLanguage
                        ? record.translationSourceLanguage.toUpperCase()
                        : '—'}
                    </td>
                    <td>
                      {record.requiresGeoBlock ? (
                        <span className={styles.badge} data-status="MEDIUM">
                          Требуется
                        </span>
                      ) : (
                        <span className={styles.mutedText}>Не требуется</span>
                      )}
                    </td>
                    <td>{record.legalBasisRu || record.notesRu || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
