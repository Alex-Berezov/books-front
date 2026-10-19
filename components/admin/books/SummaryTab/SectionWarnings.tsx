import type { FC } from 'react';
import type { BookSummarySectionWarning } from '@/types/api-schema';
import styles from './SummaryTab.module.scss';

/** Предупреждения сервера после сохранения раздела: раздел сохранён, но ссылки на главу не будет. */
export const SectionWarnings: FC<{ warnings?: BookSummarySectionWarning[] }> = ({ warnings }) =>
  warnings && warnings.length > 0 ? (
    <ul className={styles.warningList} role="status">
      {warnings.map((w, idx) => (
        <li key={idx}>{w.message}</li>
      ))}
    </ul>
  ) : null;
