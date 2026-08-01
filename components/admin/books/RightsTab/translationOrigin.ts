/**
 * WP-7.4: значения `translationOrigin` — контракт отчёта агента (`languageAssessments[]`).
 * Живут отдельно от компонентов, потому что языковой срез показывают два раздела вкладки:
 * список языковых версий и права исходного издания.
 */
export const TRANSLATION_ORIGIN_LABELS: Record<string, string> = {
  NOT_APPLICABLE_ORIGINAL: 'Оригинал',
  GUTENBERG_TRANSLATION: 'Перевод из Gutenberg',
  BIBLIARIS_TRANSLATION_FROM_ORIGINAL: 'Перевод Bibliaris с оригинала',
  BIBLIARIS_TRANSLATION_FROM_INTERMEDIATE_TRANSLATION: 'Перевод Bibliaris через промежуточный',
  THIRD_PARTY_PUBLIC_DOMAIN_TRANSLATION: 'Сторонний перевод в общественном достоянии',
  THIRD_PARTY_LICENSED_TRANSLATION: 'Сторонний перевод по лицензии',
  UNKNOWN: 'Не определено',
};

/** Единственное происхождение, при котором цепочка прав идёт через третий язык. */
export const INTERMEDIATE_TRANSLATION_ORIGIN =
  'BIBLIARIS_TRANSLATION_FROM_INTERMEDIATE_TRANSLATION';
