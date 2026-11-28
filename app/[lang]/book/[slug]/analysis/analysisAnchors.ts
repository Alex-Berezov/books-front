/**
 * Якоря разделов страницы анализа (F03-2). Одно место на `id` разделов и на ссылки «Разбор»
 * со страницы книги (`product.md` §22): `id` и ссылки берут значение отсюда, поэтому переименование
 * не оставит ссылку, которая молча перестала прокручивать (как `bookAnchors.ts`).
 */
export const ANALYSIS_ANCHORS = {
  facts: 'about-the-work',
  mainIdea: 'main-idea',
  themes: 'themes',
  characters: 'characters',
  symbols: 'symbols',
  keyQuotes: 'key-quotes',
  titleMeaning: 'title-meaning',
  endingMeaning: 'ending',
  /** «Герои книги» (F08-5, решение арбитра Q10): между финалом и нижними разделами. */
  heroes: 'analysis-heroes',
  context: 'context',
  style: 'style',
  reception: 'reception',
  adaptations: 'adaptations',
  misreadings: 'misreadings',
  discussion: 'discussion-questions',
  faq: 'faq',
  sources: 'sources',
  continue: 'analysis-continue',
} as const;

/**
 * Якорь карточки темы в разделе тем (решение арбитра `F08 | F08-13` Q7): `theme-{key}`, а не голый
 * ключ - голый совпал бы с якорями разделов (`faq`). Ключ темы - `[a-z0-9-]`, в `id` годится как есть.
 */
export function themeAnchor(key: string): string {
  return `theme-${key}`;
}

/**
 * Ссылки «Разбор» со страницы книги (§22): только у персонажей, символов и цитат и только
 * на разделы, которые в анализе есть (флаги `analysisSectionFlags`). Нет раздела - `null`.
 */
export function buildAnalysisSectionLinks(
  analysisHref: string,
  flags: { characters: boolean; symbols: boolean; keyQuotes: boolean }
): { characters: string | null; symbols: string | null; quotes: string | null } {
  const link = (on: boolean, anchor: string) => (on ? `${analysisHref}#${anchor}` : null);
  return {
    characters: link(flags.characters, ANALYSIS_ANCHORS.characters),
    symbols: link(flags.symbols, ANALYSIS_ANCHORS.symbols),
    quotes: link(flags.keyQuotes, ANALYSIS_ANCHORS.keyQuotes),
  };
}
