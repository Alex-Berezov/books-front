import type { FC } from 'react';
import { formatBookAnalysisIssue } from '@/lib/admin/book-analysis-blocks';
import type { AnalysisServerCheck } from './AnalysisTab.types';
import styles from './AnalysisTab.module.scss';

/**
 * Ядро и предупреждения сервера (`warnings`): ненайденные главы и чего не хватает до публикации.
 * Публикацию страницы открывает только ядро, отдельного статуса у анализа нет.
 */
export const AnalysisCheckSummary: FC<{ check: AnalysisServerCheck }> = ({ check }) => (
  <div className={`${styles.status} ${check.hasCore ? styles.statusOk : ''}`} role="status">
    <p>
      {check.hasCore
        ? 'Core is complete: the analysis is ready for readers of the published version.'
        : 'Core is incomplete: the analysis is not ready for readers.'}
    </p>
    {check.warnings.length > 0 && (
      <ul className={styles.issueList}>
        {check.warnings.map((w, idx) => (
          <li key={idx}>{formatBookAnalysisIssue(w)}</li>
        ))}
      </ul>
    )}
  </div>
);
