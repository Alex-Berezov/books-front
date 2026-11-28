import { Fragment, type ReactNode } from 'react';
import Link from 'next/link';
import type { WorldEntitySectionsInput } from './worldEntityTypes';
import type { BookAnalysisDetail } from '@/types/api-schema';
import analysisStyles from '../analysis/analysis.module.scss';
import { ANALYSIS_ANCHORS, themeAnchor } from '../analysis/analysisAnchors';

/**
 * Темы анализа на страницах мира - одно правило на связи предмета и темы героя (решения арбитра
 * `F08 | F08-13` Q3, Q7, `F08 | F08-13c` Q5, `F08 | F08-13d` V1): ключ берётся, только если он есть
 * в текущем анализе (`titles`), название - оттуда же, повтор ключа - одна тема; есть страница анализа -
 * ссылка на карточку темы (`theme-{key}`), нет - название текстом.
 */
export function worldThemeItems(
  keys: readonly string[] | null | undefined,
  titles: ReadonlyMap<string, string>,
  analysisHref: string | null
): ReactNode[] {
  return [...new Set(keys ?? [])].flatMap((key) => {
    const title = titles.get(key);
    if (!title) return [];
    return [
      analysisHref ? (
        <Link
          key={key}
          href={`${analysisHref}#${themeAnchor(key)}`}
          className={analysisStyles.textLink}
        >
          {title}
        </Link>
      ) : (
        <span key={key}>{title}</span>
      ),
    ];
  });
}

/**
 * Ключи тем героя (решение арбитра `F08 | F08-13` Q3): `themeKeys` карточки анализа с ключом героя;
 * не герой (пара, место, предмет) или карточки нет - пусто, у одноимённого ключа чужого типа тем нет.
 */
export function heroThemeKeysOf(
  entity: { type: string; key: string },
  analysis: Pick<BookAnalysisDetail, 'characters'> | null
): readonly string[] {
  if (entity.type !== 'character') return [];
  return (analysis?.characters ?? []).find((c) => c.key === entity.key)?.themeKeys ?? [];
}

/**
 * Пункт анализа в «Дальше» (§5 п.15, решение арбитра `F08 | F08-13d` V1): темы героя списком
 * (`worldThemeItems`); своих тем нет - «Анализ: темы» на раздел тем, у анализа нет тем - ссылка
 * на анализ без якоря; нет ни тем, ни страницы анализа - пункта нет.
 */
export function worldNextAnalysisItem(
  input: Pick<WorldEntitySectionsInput, 'heroThemeKeys' | 'themeTitles' | 'links' | 'strings'>
): ReactNode | null {
  const { links, strings } = input;
  const themes = worldThemeItems(input.heroThemeKeys, input.themeTitles, links.analysis);
  if (themes.length > 0) {
    return (
      <>
        {strings.worldHeroThemesLabel}{' '}
        {themes.map((item, i) => (
          <Fragment key={i}>
            {i > 0 ? ', ' : null}
            {item}
          </Fragment>
        ))}
      </>
    );
  }
  if (!links.analysis) return null;
  const href = links.analysisHasThemes
    ? `${links.analysis}#${ANALYSIS_ANCHORS.themes}`
    : links.analysis;
  return (
    <Link href={href} className={analysisStyles.textLink}>
      {links.analysisHasThemes ? strings.worldAnalysisThemes : strings.worldAnalysisLink}
    </Link>
  );
}
