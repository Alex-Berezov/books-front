'use client';

import type { FC } from 'react';
import type { AnalysisWrite } from '@/types/api-schema';
import styles from './AnalysisWrite.module.scss';
import {
  EXTERNAL_STEP,
  STEP_NAMES,
  droppedQuoteText,
  droppedSourceText,
  reasonText,
} from './analysisWrite.utils';

/**
 * Пройденные шаги хода (F07 `product.md` §4): «Step N of M: <шаг>», отказ шага с причиной и всё,
 * что код снял у шага, с причиной: правки без переделки (`steps[].dropped`), выброшенные цитаты
 * (`droppedQuotes`) и источники шага 5 (`droppedSources`).
 */
export const AnalysisWriteSteps: FC<{ run: AnalysisWrite }> = ({ run }) => {
  if (run.steps.length === 0) return null;
  return (
    <div className={styles.steps} aria-label="Steps of the run">
      {run.steps.map((s) => {
        const quotes = run.droppedQuotes.filter((q) => q.step === s.step);
        const sources = s.step === EXTERNAL_STEP ? run.droppedSources : [];
        const hasDropped = s.dropped.length + quotes.length + sources.length > 0;
        return (
          <div key={s.step}>
            <span>
              Step {s.step} of {run.stepsTotal}: {STEP_NAMES[s.step] ?? ''} —{' '}
              {s.outcome === 'failed' ? (
                <span className={styles.error}>failed: {reasonText(s.failedReason)}</span>
              ) : (
                'done'
              )}
            </span>
            {hasDropped && (
              <ul className={styles.list} aria-label={`Dropped at step ${s.step}`}>
                {s.dropped.map((d, i) => (
                  <li key={`fix-${i}`}>
                    {d.code} — {d.path}: {d.note}
                  </li>
                ))}
                {quotes.map((q, i) => (
                  <li key={`quote-${i}`}>Quote dropped: {droppedQuoteText(q)}</li>
                ))}
                {sources.map((src, i) => (
                  <li key={`source-${i}`}>Source dropped: {droppedSourceText(src)}</li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
};
