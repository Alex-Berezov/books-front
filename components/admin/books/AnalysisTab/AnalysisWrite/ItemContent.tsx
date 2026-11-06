'use client';

import type { FC } from 'react';
import type { AnalysisWriteItem, AnalysisWriteValue, BookAnalysisSource } from '@/types/api-schema';
import styles from './AnalysisWrite.module.scss';
import { EXTERNAL_STEP, refusalText } from './analysisWrite.utils';

/** Содержимое предложения, как его видит карточка: свежее, перечитывается или отказ. */
export interface ProposalContent {
  /** Блок — предложение готового хода: содержимое запрашивается. */
  wanted: boolean;
  /** Свежее содержимое; `undefined` — нет или перечитывается (старое не показывается). */
  value: AnalysisWriteValue | undefined;
  loading: boolean;
  error: unknown;
}

/**
 * Источники, проверенные этим ходом (предложение `sources`), — один запрос на весь ход выше, в
 * `AnalysisWrite`: фоновое перечитывание (после «Accept» соседа) прежний список не прячет.
 */
export interface RunSources {
  sources: BookAnalysisSource[] | null;
  /** Данных ещё нет и они грузятся. */
  loading: boolean;
  /** Данных нет: запрос не удался. Сохранёнными источниками это не подменяется. */
  failed: boolean;
}

/** Сохранённые источники анализа: список, отказ чтения или ещё не загружены (`undefined`). */
export interface SavedSources {
  sources: BookAnalysisSource[] | null | undefined;
  failed: boolean;
}

export interface ItemContentProps {
  item: AnalysisWriteItem;
  content: ProposalContent;
  /** Источники непринятого предложения `sources` этого хода; `null` — такого предложения нет. */
  runSources: RunSources | null;
  saved: SavedSources;
}

/** Поля содержимого, кроме текста и источников: список — JSON, как в форме вкладки. */
const LIST_FIELDS = [
  'characters',
  'keyQuotes',
  'style',
  'themes',
  'symbols',
  'misreadings',
  'discussionQuestions',
  'faq',
  'timeline',
  'adaptations',
] as const satisfies readonly (keyof AnalysisWriteValue)[];

const SourceLinks: FC<{ sources: BookAnalysisSource[] }> = ({ sources }) => (
  <ul className={styles.list}>
    {sources.map((s) => (
      <li key={s.url}>
        <a href={s.url} target="_blank" rel="noopener noreferrer nofollow">
          {s.title}
        </a>
      </li>
    ))}
  </ul>
);

/** Сохранённые источники анализа — с честной подписью: в них могут быть и добавленные руками. */
const SavedSourceList: FC<{ saved: SavedSources }> = ({ saved }) => {
  if (saved.failed) {
    return <p className={styles.error}>Could not load the sources saved in the analysis.</p>;
  }
  if (saved.sources === undefined) return null;
  if (!saved.sources || saved.sources.length === 0) {
    return <p className={styles.hint}>No sources are saved in the analysis.</p>;
  }
  return (
    <>
      <p className={styles.hint}>
        Sources saved in the analysis (they may include sources added by hand):
      </p>
      <SourceLinks sources={saved.sources} />
    </>
  );
};

const nonEmpty = (sources: BookAnalysisSource[] | null | undefined) =>
  sources && sources.length > 0 ? sources : null;

/**
 * Содержимое предложения (`GET content-drafts/:id/items/:index`: в ответ хода оно не идёт) и у
 * внешних блоков шага 5 — всегда «Verify facts» с источниками (F07 `product.md` §3.3, §5): код
 * проверил, что источник открылся и он про эту книгу, но не что в нём то же самое. Источники —
 * свои у предложения; нет своих — предложение `sources` этого хода; нет и его — сохранённые
 * в анализе, с такой подписью. У самого блока `sources` — один список. Пока содержимое
 * перечитывается, старое не показывается.
 */
export const ItemContent: FC<ItemContentProps> = ({ item, content, runSources, saved }) => {
  const external = item.step === EXTERNAL_STEP;
  const isSources = item.target === 'sources';
  const own = nonEmpty(content.value?.sources);
  const runWanted = external && !isSources && !own && runSources !== null;
  const fromRun = runWanted ? nonEmpty(runSources?.sources) : null;
  const value = content.value;

  return (
    <>
      {content.wanted && content.error ? (
        <p className={styles.error} role="alert">
          Could not load the proposal: {refusalText(content.error)}
        </p>
      ) : null}
      {content.wanted && content.loading && <p className={styles.hint}>Loading the proposal…</p>}
      {value?.text != null && <pre className={styles.preview}>{value.text}</pre>}
      {value &&
        LIST_FIELDS.map((field) =>
          value[field] ? (
            <pre key={field} className={styles.preview}>
              {JSON.stringify(value[field], null, 2)}
            </pre>
          ) : null
        )}
      {external && (
        <div>
          <p className={styles.verify}>
            Verify facts: the code checked that each source opens and is about this book, not that
            it says the same. Check dates and names against the sources.
          </p>
          {own ? (
            <>
              <p className={styles.hint}>
                {isSources ? 'Sources of this proposal:' : 'Verified sources of this proposal:'}
              </p>
              <SourceLinks sources={own} />
            </>
          ) : isSources && content.wanted ? null : runWanted && runSources?.failed ? (
            <p className={styles.error}>Could not load the sources of this run.</p>
          ) : runWanted && runSources?.loading ? (
            <p className={styles.hint}>Loading the sources of this run…</p>
          ) : fromRun ? (
            <>
              <p className={styles.hint}>
                Sources verified by this run (the Sources proposal, not saved yet):
              </p>
              <SourceLinks sources={fromRun} />
            </>
          ) : (
            <SavedSourceList saved={saved} />
          )}
        </div>
      )}
    </>
  );
};
