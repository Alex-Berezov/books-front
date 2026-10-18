import { describe, expect, it } from 'vitest';
import {
  sortCharacters,
  splitParagraphs,
  themeColorIndex,
  THEME_COLOR_COUNT,
} from '@/lib/book-analysis/format';
import {
  buildAnalysisAlternates,
  describeAnalysis,
  pickAnalysisPageVersion,
  pickAnalysisVersion,
  versionHasAnalysis,
} from '@/lib/seo/book-analysis';
import { buildLangUrl } from '@/lib/seo/urls';
import type { BookAnalysisCharacter, BookOverview } from '@/types/api-schema';

/**
 * Правила страницы анализа (F03-2): одна версия на язык, hreflang только языков с анализом,
 * описание из главной мысли, порядок героев по ролям, абзацы простого текста (T3).
 */

const v = (language: string, slug: string, analyses?: number) => ({
  id: `v-${language}`,
  language,
  slug,
  ...(analyses === undefined ? {} : { _count: { analyses } }),
});

describe('book-analysis', () => {
  it('versionHasAnalysis: только подтверждённый счётчик > 0; нет счётчика - нет анализа', () => {
    expect(versionHasAnalysis({ _count: { analyses: 1 } })).toBe(true);
    expect(versionHasAnalysis({ _count: { analyses: 0 } })).toBe(false);
    expect(versionHasAnalysis({})).toBe(false);
  });

  it('pickAnalysisVersion: версия языка страницы с анализом, без отката на другой язык', () => {
    const book = { versions: [v('en', 'hamlet', 1), v('ru', 'gamlet', 0)] } as unknown as Pick<
      BookOverview,
      'versions'
    >;
    expect(pickAnalysisVersion(book, 'en')?.id).toBe('v-en');
    expect(pickAnalysisVersion(book, 'ru')).toBeNull();
    expect(pickAnalysisVersion(book, 'fr')).toBeNull();
  });

  // Доступ к странице - по версии языка, а не по счётчику: блок по одной стране счётчик гасит везде,
  // а страница должна остаться открытой вне страны блока (решение арбитра `F03 | F03-2`).
  it('pickAnalysisPageVersion: версия языка страницы и при нулевом счётчике', () => {
    const book = { versions: [v('en', 'hamlet', 0), v('ru', 'gamlet', 1)] } as unknown as Pick<
      BookOverview,
      'versions'
    >;
    expect(pickAnalysisPageVersion(book, 'en')?.id).toBe('v-en');
    expect(pickAnalysisVersion(book, 'en')).toBeNull();
    expect(pickAnalysisPageVersion(book, 'fr')).toBeNull();
  });

  it('buildAnalysisAlternates: только языки с анализом, x-default - английский', () => {
    expect(
      buildAnalysisAlternates([v('en', 'hamlet', 1), v('fr', 'hamlet-fr', 1), v('ru', 'gamlet', 0)])
    ).toEqual({
      en: buildLangUrl('en', '/book/hamlet/analysis'),
      fr: buildLangUrl('fr', '/book/hamlet-fr/analysis'),
      'x-default': buildLangUrl('en', '/book/hamlet/analysis'),
    });
    expect(buildAnalysisAlternates([v('ru', 'gamlet', 0)])).toBeUndefined();
  });

  it('describeAnalysis: начало главной мысли в одну строку, не длиннее 160 знаков', () => {
    expect(describeAnalysis('One.\n\nTwo.')).toBe('One. Two.');
    const long = describeAnalysis('word '.repeat(60)) ?? '';
    expect(long.length).toBeLessThanOrEqual(160);
    expect(long.endsWith('…')).toBe(true);
    expect(describeAnalysis('   ')).toBeUndefined();
  });

  it('splitParagraphs: делитель - пустая строка, пустые абзацы выброшены', () => {
    expect(splitParagraphs('A\n\nB\n  \nC')).toEqual(['A', 'B', 'C']);
    expect(splitParagraphs('  ')).toEqual([]);
    expect(splitParagraphs(null)).toEqual([]);
  });

  it('sortCharacters: главные, второстепенные, эпизодические; внутри - порядок данных', () => {
    const c = (key: string, role: BookAnalysisCharacter['role']) =>
      ({ key, name: key, role }) as BookAnalysisCharacter;
    expect(
      sortCharacters([c('m1', 'minor'), c('s1', 'secondary'), c('a', 'main'), c('b', 'main')]).map(
        (x: BookAnalysisCharacter) => x.key
      )
    ).toEqual(['a', 'b', 's1', 'm1']);
  });

  it('themeColorIndex: цвет по порядку темы, по кругу палитры', () => {
    expect(themeColorIndex(0)).toBe(0);
    expect(themeColorIndex(THEME_COLOR_COUNT)).toBe(0);
    expect(themeColorIndex(THEME_COLOR_COUNT + 1)).toBe(1);
  });
});

describe('палитра тем', () => {
  // Число цветов в коде и в токенах - одно: разойдутся, и у тем с конца палитры не будет цвета.
  it('THEME_COLOR_COUNT совпадает с числом цветов $color-analysis-themes', async () => {
    const { readFileSync } = await import('node:fs');
    const scss = readFileSync('styles/tokens.scss', 'utf-8');
    const list = /\$color-analysis-themes:\s*\(([\s\S]*?)\);/.exec(scss)?.[1] ?? '';
    expect(list.match(/oklch\(/g)?.length).toBe(THEME_COLOR_COUNT);
  });
});
