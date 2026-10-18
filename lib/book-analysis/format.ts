import type {
  BookAnalysisBlocks,
  BookAnalysisCharacter,
  BookAnalysisRole,
} from '@/types/api-schema';

/**
 * Чистые помощники отрисовки страницы анализа (F03): заполненность поля, абзацы, порядок героев,
 * цвет темы. Без зависимостей - их читает и серверная страница, и тесты (как `lib/author/`).
 */

/** Заполнено ли поле: после обрезки пробелов остался текст (правило ядра, `product.md` §2). */
export function hasText(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/** Абзацы простого текста блока (T3): делитель - пустая строка, пустые абзацы выброшены. */
export function splitParagraphs(text: string | null | undefined): string[] {
  return (text ?? '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

const ROLE_ORDER: Record<BookAnalysisRole, number> = { main: 0, secondary: 1, minor: 2 };

/** Герои: главные, затем второстепенные, затем эпизодические; внутри - порядок данных (§7). */
export function sortCharacters(characters: readonly BookAnalysisCharacter[]) {
  return characters
    .map((character, index) => ({ character, index }))
    .sort(
      (a, b) =>
        (ROLE_ORDER[a.character.role] ?? 3) - (ROLE_ORDER[b.character.role] ?? 3) ||
        a.index - b.index
    )
    .map(({ character }) => character);
}

/** Число цветов тем в палитре (`$color-analysis-themes` в `styles/tokens.scss`): по индексу темы (T8). */
export const THEME_COLOR_COUNT = 8;

/** Номер цвета темы - её порядок в данных, по кругу палитры: один на карточку и метки. */
export function themeColorIndex(themeIndex: number): number {
  return themeIndex % THEME_COLOR_COUNT;
}

/**
 * Какие разделы анализа выводятся (`product.md` §1.4: раздел без данных не выводится). Один
 * предикат на страницу анализа (оглавление и разделы) и на страницу книги (ссылки «Разбор»):
 * разойдутся - ссылка поведёт на якорь, которого на странице нет.
 */
export function analysisSectionFlags(
  analysis: Pick<
    BookAnalysisBlocks,
    'themes' | 'characters' | 'symbols' | 'keyQuotes' | 'titleMeaning' | 'endingMeaning'
  >
) {
  return {
    themes: (analysis.themes?.length ?? 0) > 0,
    characters: (analysis.characters?.length ?? 0) > 0,
    symbols: (analysis.symbols?.length ?? 0) > 0,
    keyQuotes: (analysis.keyQuotes?.length ?? 0) > 0,
    titleMeaning: hasText(analysis.titleMeaning),
    endingMeaning: hasText(analysis.endingMeaning),
  };
}
