/**
 * Якоря разделов страниц мира книги (F08-3b). Одно место на `id` разделов и пункты оглавления:
 * переименование не оставит ссылку, которая молча перестала прокручивать (как `analysisAnchors.ts`).
 */
export const WORLD_ANCHORS = {
  heroes: 'characters',
  places: 'places',
  relationsMap: 'relations-map',
  links: 'more',
  about: 'about',
  short: 'in-brief',
  presence: 'presence',
  appearance: 'appearance',
  character: 'character',
  arc: 'path',
  scenes: 'scenes',
  relations: 'relations',
  quotes: 'quotes',
  critique: 'critique',
  prototypes: 'prototypes',
  adaptations: 'adaptations',
  sources: 'sources',
  faq: 'faq',
  next: 'next',
  compare: 'compare',
  pairCommon: 'shared-chapters',
  pairBonds: 'bonds',
  pairDifferences: 'differences',
  pairConclusion: 'conclusion',
  placeSignificance: 'significance',
  placeDescription: 'description',
} as const;
