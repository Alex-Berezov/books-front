'use client';

import type { FC, ReactNode } from 'react';
import type { RightsIntake } from '@/types/api-schema/rights-intake';
import styles from './IntakeOverview.module.scss';

const LANG_LABELS: Record<string, string> = {
  en: 'English (en)',
  es: 'Spanish (es)',
  fr: 'French (fr)',
  pt: 'Portuguese (pt)',
  ru: 'Russian (ru)',
};

interface IntakeOverviewProps {
  intake: RightsIntake;
}

export const IntakeOverview: FC<IntakeOverviewProps> = ({ intake }) => {
  return (
    <div className={styles.grid}>
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Work</h2>
        <DetailRow label="Title" value={intake.candidateTitle} />
        <DetailRow label="Author" value={intake.candidateAuthor} />
        <DetailRow label="Original Title" value={intake.originalTitle} />
        <DetailRow label="Original Language" value={intake.originalLanguage} />
        <DetailRow label="Birth Year" value={intake.authorBirthYear?.toString()} />
        <DetailRow label="Death Year" value={intake.authorDeathYear?.toString()} />
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Source</h2>
        <DetailRow label="Provider" value={intake.sourceProvider} />
        <DetailRow label="External ID" value={intake.sourceExternalId} />
        <DetailRow
          label="URL"
          value={
            intake.sourceUrl ? (
              <a href={intake.sourceUrl} target="_blank" rel="noopener noreferrer">
                {intake.sourceUrl}
              </a>
            ) : null
          }
        />
        <DetailRow label="Source Title" value={intake.sourceTitle} />
        <DetailRow label="Language" value={intake.sourceLanguage} />
        <DetailRow label="Text Type" value={intake.sourceTextType} />
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Publication Plan</h2>
        <DetailRow
          label="Target Languages"
          value={intake.targetLanguages.map((l) => LANG_LABELS[l] || l.toUpperCase()).join(', ')}
        />
        <DetailRow
          label="Target Countries"
          value={`${intake.targetCountryCodes.length} countries (${intake.targetCountryCodes.join(', ')})`}
        />
        <DetailRow label="Content Types" value={intake.plannedContentTypes.join(', ')} />
        <DetailRow label="Components" value={intake.plannedComponents?.join(', ') || '-'} />
      </div>

      {intake.notesRu && (
        <div className={`${styles.section} ${styles.notesSection}`}>
          <h2 className={styles.sectionTitle}>Notes (Russian)</h2>
          <p className={styles.notes}>{intake.notesRu}</p>
        </div>
      )}
    </div>
  );
};

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className={styles.detailRow}>
      <span className={styles.detailLabel}>{label}</span>
      <span className={styles.detailValue}>{value ?? '-'}</span>
    </div>
  );
}
