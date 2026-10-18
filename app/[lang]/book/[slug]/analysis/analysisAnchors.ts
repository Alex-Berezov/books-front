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
} as const;
