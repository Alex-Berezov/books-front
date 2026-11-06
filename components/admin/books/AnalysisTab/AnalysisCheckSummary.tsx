import type { FC } from 'react';
import { formatBookAnalysisIssue } from '@/lib/admin/book-analysis-blocks';
import type { AnalysisServerCheck } from './AnalysisTab.types';
import styles from './AnalysisTab.module.scss';

export interface AnalysisCheckSummaryProps {
  check: AnalysisServerCheck;
  /**
   * Ядро показывает плашка хода «Write Analysis» (у `admin`, F07-3a): здесь — только остальные
   * предупреждения, одно состояние ядра одним текстом.
   */
  withoutCore?: boolean;
}

/**
 * Ядро и предупреждения сервера (`warnings`): ненайденные главы и чего не хватает до публикации.
 * Публикацию страницы открывает только ядро, отдельного статуса у анализа нет.
 */
export const AnalysisCheckSummary: FC<AnalysisCheckSummaryProps> = ({
  check,
  withoutCore = false,
}) => {
  const warnings = withoutCore
    ? check.warnings.filter((w) => w.code !== 'core_incomplete')
    : check.warnings;
  if (withoutCore && warnings.length === 0) return null;
  return (
    <div
      className={`${styles.status} ${check.hasCore && !withoutCore ? styles.statusOk : ''}`}
      role="status"
    >
      {!withoutCore && (
        <p>
          {check.hasCore
            ? 'Core is complete: the analysis is ready for readers of the published version.'
            : 'Core is incomplete: the analysis is not ready for readers.'}
        </p>
      )}
      {warnings.length > 0 && (
        <ul className={styles.issueList}>
          {warnings.map((w, idx) => (
            <li key={idx}>{formatBookAnalysisIssue(w)}</li>
          ))}
        </ul>
      )}
    </div>
  );
};
