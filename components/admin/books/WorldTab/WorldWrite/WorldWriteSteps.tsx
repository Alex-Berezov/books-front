'use client';

import type { FC } from 'react';
import { droppedSourceText } from '@/components/admin/books/ContentDraft/contentDraft.utils';
import type { WorldWrite } from '@/types/api-schema';
import {
  droppedQuoteText,
  leftOutText,
  runOffTexts,
  pairLine,
  pairsOffText,
  placeLine,
  placesOffText,
  coreMissingText,
  reasonText,
  stepTitle,
} from './worldWrite.utils';
import draftStyles from '@/components/admin/books/ContentDraft/ContentDraft.module.scss';

/**
 * Пройденные шаги хода (F08 `tech.md` §5): герои и формы имени, затем страница и внешние блоки
 * по герою; отказ шага с причиной и всё, что код снял у шага, с причиной: правки без переделки
 * (`steps[].dropped`), выброшенные цитаты героя (`droppedQuotes`, у шага страницы) и источники
 * (`droppedSources`, у шага внешних блоков); шаг пары — после шагов героев; отсеянные герои и пары с причиной.
 */
export const WorldWriteSteps: FC<{ run: WorldWrite }> = ({ run }) => {
  const leftOut = run.leftOut ?? [];
  const pairsOff = pairsOffText(run);
  const placesOff = placesOffText(run);
  const runOff = runOffTexts(run);
  if (
    run.steps.length === 0 &&
    leftOut.length === 0 &&
    pairsOff === null &&
    placesOff === null &&
    runOff.length === 0
  ) {
    return null;
  }
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
      {run.pairs && run.pairs.length > 0 && (
        <p className={draftStyles.hint}>
          Pairs: {run.pairs.map((p) => pairLine(run, p)).join('; ')}.
        </p>
      )}
      {pairsOff && <p className={draftStyles.hint}>{pairsOff}</p>}
      {run.places && run.places.length > 0 && (
        <p className={draftStyles.hint}>Places: {run.places.map(placeLine).join('; ')}.</p>
      )}
      {placesOff && <p className={draftStyles.hint}>{placesOff}</p>}
      {/* Предметы и понятия хода (`F08-13b`): та же строка, что у мест. */}
      {run.objects && run.objects.length > 0 && (
        <p className={draftStyles.hint}>Objects: {run.objects.map(placeLine).join('; ')}.</p>
      )}
      {run.terms && run.terms.length > 0 && (
        <p className={draftStyles.hint}>Terms: {run.terms.map(placeLine).join('; ')}.</p>
      )}
      {/* События хода (`F08-13b-2`): называет шаг выбора, строка та же. */}
      {run.events && run.events.length > 0 && (
        <p className={draftStyles.hint}>Events: {run.events.map(placeLine).join('; ')}.</p>
      )}
      {runOff.map((text) => (
        <p key={text} className={draftStyles.hint}>
          {text}
        </p>
      ))}
      {leftOut.length > 0 && (
        <ul className={draftStyles.list} aria-label="Left out of the run">
          {leftOut.map((skip, i) => (
            <li key={`${i}:${skip.reason}:${skip.key}`}>{leftOutText(run, skip)}</li>
          ))}
        </ul>
      )}
      {run.steps.map((s) => {
        const quotes =
          s.kind === 'page' ||
          s.kind === 'pair' ||
          s.kind === 'place' ||
          s.kind === 'object' ||
          s.kind === 'term' ||
          s.kind === 'event'
            ? run.droppedQuotes.filter((q) => q.key === s.key)
            : [];
        const sources =
          s.kind === 'external' ? run.droppedSources.filter((d) => d.key === s.key) : [];
        const hasDropped = s.dropped.length + quotes.length + sources.length > 0;
        // Нет части ядра пары (`pairCoreRemarks` бэкенда) на момент шага. Замечание по блоку, у которого
        // есть пункт хода (`compare` короче ядра), бэкенд кладёт и в пункт (`remarksOfBlock`) - оно видно
        // в его карточке; здесь только замечания по блоку без пункта (`short`, `conclusion` не написаны).
        const core = s.remarks.filter(
          (r) =>
            r.code === 'CORE_MISSING' &&
            !run.items.some((i) => i.step === s.step && i.block === r.where)
        );
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
            {core.length > 0 && (
              <ul className={draftStyles.list} aria-label={`Core missing at step ${s.step + 1}`}>
                {core.map((r, i) => (
                  <li key={`core-${i}`} className={draftStyles.error}>
                    {coreMissingText(r)}
                  </li>
                ))}
              </ul>
            )}
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
