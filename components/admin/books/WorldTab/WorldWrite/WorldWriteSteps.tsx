'use client';

import type { FC } from 'react';
import { droppedSourceText } from '@/components/admin/books/ContentDraft/contentDraft.utils';
import type { WorldWrite } from '@/types/api-schema';
import { droppedQuoteText, reasonText, stepTitle } from './worldWrite.utils';
import draftStyles from '@/components/admin/books/ContentDraft/ContentDraft.module.scss';

/**
 * Пройденные шаги хода (F08 `tech.md` §5): герои и формы имени, затем страница и внешние блоки
 * по герою; отказ шага с причиной и всё, что код снял у шага, с причиной: правки без переделки
 * (`steps[].dropped`), выброшенные цитаты героя (`droppedQuotes`, у шага страницы) и источники
 * (`droppedSources`, у шага внешних блоков).
 */
export const WorldWriteSteps: FC<{ run: WorldWrite }> = ({ run }) => {
  if (run.steps.length === 0) return null;
  const total = run.stepsTotal;
  return (
    <div className={draftStyles.steps} aria-label="Steps of the run">
      {run.candidates && run.candidates.length > 0 && (
        <p className={draftStyles.hint}>
          Characters:{' '}
          {run.candidates
            .map(
              (c) => `${c.name} (${c.aliases.length > 0 ? c.aliases.join(', ') : 'no name forms'})`
            )
            .join('; ')}
          .
        </p>
      )}
      {run.steps.map((s) => {
        const quotes = s.kind === 'page' ? run.droppedQuotes.filter((q) => q.key === s.key) : [];
        const sources =
          s.kind === 'external' ? run.droppedSources.filter((d) => d.key === s.key) : [];
        const hasDropped = s.dropped.length + quotes.length + sources.length > 0;
        return (
          <div key={s.step}>
            <span>
              Step {s.step + 1}
              {total !== null ? ` of ${total}` : ''}: {stepTitle(run, s)} —{' '}
              {s.outcome === 'failed' ? (
                <span className={draftStyles.error}>failed: {reasonText(s.failedReason)}</span>
              ) : (
                'done'
              )}
            </span>
            {hasDropped && (
              <ul className={draftStyles.list} aria-label={`Dropped at step ${s.step + 1}`}>
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
