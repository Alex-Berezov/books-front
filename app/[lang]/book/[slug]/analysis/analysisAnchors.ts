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
